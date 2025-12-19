import prisma from "../utils/prismaClient.js";

// CRUD — базові адмінські операції

export async function createStatistics(req, res) {
  try {
    const data = req.body;
    const stat = await prisma.statistics.create({ data });
    res.status(201).json(stat);
  } catch (err) {
    console.error("Помилка створення статистики:", err);
    res.status(500).json({ error: "Не вдалося створити статистику" });
  }
}

export async function getStatistics(req, res) {
  try {
    const stats = await prisma.statistics.findMany({
      include: { users: true },
    });
    res.json(stats);
  } catch (err) {
    console.error("Помилка отримання статистики:", err);
    res.status(500).json({ error: "Не вдалося отримати статистику" });
  }
}

export async function updateStatistics(req, res) {
  try {
    const { id } = req.params;
    const stat = await prisma.statistics.update({
      where: { stats_id: parseInt(id) },
      data: req.body,
    });
    res.json(stat);
  } catch (err) {
    console.error("Помилка оновлення статистики:", err);
    res.status(500).json({ error: "Не вдалося оновити статистику" });
  }
}

export async function deleteStatistics(req, res) {
  try {
    const { id } = req.params;
    await prisma.statistics.delete({
      where: { stats_id: parseInt(id) },
    });
    res.json({ message: "Запис статистики видалено" });
  } catch (err) {
    console.error("Помилка видалення статистики:", err);
    res.status(500).json({ error: "Не вдалося видалити запис статистики" });
  }
}

// ВНУТРІШНЯ ФУНКЦІЯ — перерахунок статистики користувача

async function calculateForUser(user_id, period = "current") {
  const numericId = Number(user_id);

  // 1) Беремо задачі користувача
  const tasks = await prisma.tasks.findMany({
    where: { user_id: numericId },
  });

  if (tasks.length === 0) {
    return { error: "У користувача немає задач" };
  }

  // 2) Визначаємо статус «Виконано»
  const statuses = await prisma.statuses.findMany();
  const doneStatus = statuses.find(s => s.name.toLowerCase() === "виконано");
  const doneStatusId = doneStatus ? doneStatus.status_id : null;

  // Задачі, де статус встановлений
  const trackedTasks = tasks.filter(t => t.status_id !== null);

  // 3) Скільки завершено
  let completed = 0;
  if (doneStatusId !== null) {
    completed = trackedTasks.filter(t => t.status_id === doneStatusId).length;
  }

  // Відсоток виконання
  const completed_percent =
    trackedTasks.length > 0
      ? Math.round((completed / trackedTasks.length) * 100)
      : 0;

  // 4) Перевантаження
  const overload_days =
    trackedTasks.length > 0 ? Math.floor(trackedTasks.length / 5) : 0;

  // 5) Підрахунок задач по категоріях
  const categoriesCount = {};
  for (const t of tasks) {
    const key = t.category_id ?? "uncategorized";
    categoriesCount[key] = (categoriesCount[key] || 0) + 1;
  }

  // 6) Обчислення балансу категорій
  let category_balance = 1;
  const values = Object.values(categoriesCount);
  if (values.length > 1) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const deviation =
      Math.sqrt(values.map(v => (v - avg) ** 2).reduce((a, b) => a + b, 0) / values.length);
    category_balance = Math.max(0, 1 - deviation / avg);
  }

  // 7) Витягуємо назви категорій
  const catKeys = Object.keys(categoriesCount).filter(id => id !== "uncategorized");
  const catIds = catKeys.map(id => Number(id));

  let categoryMap = {};
  if (catIds.length > 0) {
    const cats = await prisma.categories.findMany({
      where: { category_id: { in: catIds } },
    });
    categoryMap = Object.fromEntries(cats.map(c => [c.category_id, c]));
  }

  // 8) Класифікація задач: робота / відпочинок
  let workTasks = 0;
  let restTasks = 0;

  const REST_WORDS = [
    "відпочинок", "релакс", "хобі", "спорт", "дозвілля", "перерва",
    "отдых", "relax", "hobby", "break", "gym", "спортзал"
  ];

  const WORK_WORDS = [
    "робота", "проєкт", "проект", "навчання", "учеба",
    "study", "курс", "work", "project", "office", "навч", "task"
  ];

  for (const [id, count] of Object.entries(categoriesCount)) {
    if (id === "uncategorized") continue;

    const name = (categoryMap[Number(id)]?.name || "").toLowerCase();

    const isRest = REST_WORDS.some(word => name.includes(word));
    const isWork = WORK_WORDS.some(word => name.includes(word));

    if (isRest) restTasks += count;
    else if (isWork) workTasks += count;
  }

  // 9) Пошук макс/мін категорій
  const entries = Object.entries(categoriesCount);

  let maxCat = entries[0][0];
  let minCat = entries[0][0];

  let maxVal = entries[0][1];
  let minVal = entries[0][1];

  for (const [cat, val] of entries) {
    if (val > maxVal) {
      maxVal = val;
      maxCat = cat;
    }
    if (val < minVal) {
      minVal = val;
      minCat = cat;
    }
  }

  // Якщо всі рівні → немає сенсу повертати max/min
  const allEqual = entries.every(([_, v]) => v === maxVal);
  if (allEqual) {
    maxCat = null;
    minCat = null;
  }

  // 10) Отримуємо попередню статистику
  const last = await prisma.statistics.findFirst({
    where: { user_id: numericId },
    orderBy: { stats_id: "desc" }
  });

  let progress = null;
  if (last && last.completed_percent !== null) {
    progress = completed_percent - last.completed_percent;
  }

// ВИПАДОК 1: немає жодного статусу — не аналізуємо прогрес

  if (trackedTasks.length === 0) {
    let recommendation_text =
      "Статус виконання задач поки ніде не вказаний. Позначайте прогрес, щоб система могла показати реальну продуктивність.";

    let detailedAdvice = "";

    if (workTasks > 0 && restTasks === 0) {
      detailedAdvice =
        "Усі задачі робочі або навчальні. Додайте хоч щось для відпочинку — спорт, хобі або перерви.";
    } else if (restTasks > 0 && workTasks === 0) {
      detailedAdvice =
        "У плані зараз лише задачі «для себе». Якщо є важливі робочі чи навчальні задачі — додайте їх.";
    } else {
      detailedAdvice =
        "Додайте кілька задач зі статусом, щоб система могла порахувати продуктивність.";
    }

    return {
      base: {
        user_id: numericId,
        period,
        completed_percent: 0,
        overload_days: 0,
        category_balance,
        recommendation_text,
      },
      analysis: {
        progress: null,
        maxCategory: maxCat,
        minCategory: minCat,
        detailedAdvice,
        tasksByCategory: categoriesCount,
        workTasks,
        restTasks,
      },
    };
  }

// ВИПАДОК 2: нормальний повний розрахунок

  let recommendation_text = "";

  // Головна оцінка
  if (completed_percent >= 75 && overload_days <= 2 && category_balance >= 0.8) {
    recommendation_text = "Все виглядає збалансовано: задачі виконуються, перевантаження немає.";
  } else if (completed_percent >= 60 && overload_days > 2) {
    recommendation_text = "Працюєте добре, але інколи берете на себе забагато. Спробуйте рівномірніше розподіляти навантаження.";
  } else if (completed_percent < 60) {
    recommendation_text = "Продуктивність поки низька. Починайте день з найважливіших задач.";
  } else if (category_balance < 0.6) {
    recommendation_text = "Є перекіс у плануванні — задачі зосереджені в одній категорії.";
  } else {
    recommendation_text = "Баланс дотримано.";
  }

  // Баланс робота / відпочинок
  if (workTasks > 0 && restTasks === 0) {
    recommendation_text += " Додайте хоча б трохи задач для відпочинку.";
  } else if (restTasks > workTasks * 2) {
    recommendation_text += " Занадто багато відпочинку — якщо є важливі задачі, заплануйте їх теж.";
  }

  // Детальна порада
  let detailedAdvice = "";

  if (progress !== null) {
    if (progress > 0) detailedAdvice += `Продуктивність зросла на ${progress}%. `;
    if (progress < 0) detailedAdvice += `Продуктивність знизилась на ${Math.abs(progress)}%. `;
  }

  if (maxCat !== null && minCat !== null) {
    detailedAdvice += `Найбільше задач у категорії ${maxCat}, найменше — у ${minCat}.`;
  } else {
    detailedAdvice += "Кількість задач у всіх категоріях однакова.";
  }

  return {
    base: {
      user_id: numericId,
      period,
      completed_percent,
      overload_days,
      category_balance,
      recommendation_text,
    },
    analysis: {
      maxCategory: maxCat,
      minCategory: minCat,
      progress,
      detailedAdvice,
      tasksByCategory: categoriesCount,
      workTasks,
      restTasks,
    },
  };
}

// ГОЛОВНИЙ МЕТОД — оновити і повернути статистику

export async function getUserStatistics(req, res) {
  try {
    const numericId = Number(req.params.id);

    const result = await calculateForUser(numericId);
    if (result.error) return res.status(400).json({ error: result.error });

    const existing = await prisma.statistics.findFirst({
      where: { user_id: numericId },
      orderBy: { stats_id: "desc" },
    });

    let saved;
    if (existing) {
      saved = await prisma.statistics.update({
        where: { stats_id: existing.stats_id },
        data: result.base,
      });
    } else {
      saved = await prisma.statistics.create({ data: result.base });
    }

    res.json({ stats: saved, analysis: result.analysis });
  } catch (err) {
    console.error("Помилка отримання статистики:", err);
    res.status(500).json({ error: "Не вдалося отримати статистику" });
  }
}

// Ручний calculate (для тестів / Thunder Client)

export async function calculateStatistics(req, res) {
  try {
    const { user_id, period } = req.body;
    const result = await calculateForUser(user_id, period || "current");
    res.json(result);
  } catch (err) {
    console.error("Помилка ручного обчислення статистики:", err);
    res.status(500).json({ error: "Не вдалося обчислити статистику" });
  }
}
