import prisma from "../utils/prismaClient.js";

/*
CREATE — створити нову задачу
Якщо задача позначена як is_shared = true, вона стане видимою всім підписникам планерника.
Якщо у підписника немає потрібної категорії — вона створюється автоматично.
*/
export async function createTask(req, res) {
  try {
    const {
      user_id,
      planner_id,
      title,
      description,
      category_id,
      priority,
      status_id,
      start_time,
      duration,
      deadline,
      is_shared,
      is_repeating,
    } = req.body;

    // створюємо основну задачу
    const task = await prisma.tasks.create({
      data: {
        user_id: +user_id,
        planner_id: planner_id ? +planner_id : null,
        title,
        description,
        category_id: category_id ? +category_id : null,
        priority: priority ? +priority : 1,
        status_id: status_id ? +status_id : null,
        start_time: start_time ? new Date(start_time) : null,
        duration: duration ? +duration : null,
        deadline: deadline ? new Date(deadline) : null,
        is_shared: !!is_shared,
        is_repeating: !!is_repeating,
      },
    });

    // якщо задача позначена як спільна — дублюємо для підписників
    if (is_shared && planner_id) {
      const subs = await prisma.plannerSubscription.findMany({
        where: { planner_id: +planner_id },
        include: { user: true },
      });

      for (const sub of subs) {
        if (sub.user_id === +user_id) continue; // не дублюємо власнику

        // шукаємо оригінальну категорію
        let newCategoryId = category_id ? +category_id : null;
        if (category_id) {
          const origCat = await prisma.categories.findUnique({
            where: { category_id: +category_id },
          });
          if (origCat) {
            // якщо у користувача немає такої категорії — створюємо
            let existing = await prisma.categories.findFirst({
              where: { user_id: sub.user_id, name: origCat.name },
            });
            if (!existing) {
              existing = await prisma.categories.create({
                data: {
                  user_id: sub.user_id,
                  name: origCat.name,
                  color: origCat.color,
                },
              });
            }
            newCategoryId = existing.category_id;
          }
        }

        // створюємо копію задачі для підписника
        await prisma.tasks.create({
          data: {
            user_id: sub.user_id,
            planner_id: +planner_id,
            title,
            description,
            category_id: newCategoryId,
            priority: priority ? +priority : 1,
            status_id: status_id ? +status_id : null,
            start_time: start_time ? new Date(start_time) : null,
            duration: duration ? +duration : null,
            deadline: deadline ? new Date(deadline) : null,
            is_shared: false, // копії у підписників не публічні
            is_repeating: !!is_repeating,
          },
        });
      }
    }

    res.status(201).json(task);
  } catch (err) {
    console.error("❌ Помилка створення задачі:", err);
    res.status(500).json({ error: "Не вдалося створити задачу" });
  }
}

// READ — отримати всі задачі користувача Повертає власні задачі + спільні задачі з підписок.

export async function getTasks(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "Не вказано user_id" });
    }

    // шукаємо всі підписки користувача
    const subs = await prisma.plannerSubscription.findMany({
      where: { user_id: +user_id },
    });
    const plannerIds = subs.map((s) => s.planner_id);

    // отримуємо задачі
    const tasks = await prisma.tasks.findMany({
      where: {
        OR: [
          { user_id: +user_id },
          { planner_id: { in: plannerIds }, is_shared: true },
        ],
      },
      include: {
        categories: true,
        statuses: true,
        planner: true,
      },
      orderBy: { task_id: "desc" },
    });

    res.json(tasks);
  } catch (err) {
    console.error("❌ Помилка отримання задач:", err);
    res.status(500).json({ error: "Не вдалося отримати задачі" });
  }
}

// UPDATE — оновити задачу Користувачі можуть змінювати тільки свої задачі.

export async function updateTask(req, res) {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      status_id,
      priority,
      start_time,
      duration,
      deadline,
      is_repeating,
      category_id,
      planner_id,
      is_shared,            // ✅ читаем флаг из body
    } = req.body;

    // 1️⃣ Берём задачу "до обновления"
    const existing = await prisma.tasks.findUnique({
      where: { task_id: +id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Задача не знайдена" });
    }

    const wasShared = existing.is_shared;

    // 2️⃣ Обновляем задачу
    const updated = await prisma.tasks.update({
      where: { task_id: +id },
      data: {
        title,
        description,
        status_id: status_id ? +status_id : null,
        priority: priority ? +priority : null,
        start_time: start_time ? new Date(start_time) : null,
        duration: duration ? +duration : null,
        deadline: deadline ? new Date(deadline) : null,
        is_repeating:
          is_repeating !== undefined ? !!is_repeating : undefined,
        category_id: category_id ? +category_id : undefined,
        planner_id: planner_id ? +planner_id : undefined,
        is_shared:
          is_shared !== undefined ? !!is_shared : undefined, // ✅ реально меняем
      },
    });

    // 3️⃣ Якщо раніше не була спільною, а тепер стала — роздаємо підписникам
    if (!wasShared && updated.is_shared && updated.planner_id) {
      const subs = await prisma.plannerSubscription.findMany({
        where: { planner_id: updated.planner_id },
        include: { user: true },
      });

      for (const sub of subs) {
        if (sub.user_id === updated.user_id) continue; // не дублюємо власнику

        // шукаємо / створюємо категорію для підписника
        let newCategoryId = updated.category_id ? updated.category_id : null;

        if (updated.category_id) {
          const origCat = await prisma.categories.findUnique({
            where: { category_id: updated.category_id },
          });

          if (origCat) {
            let existingCat = await prisma.categories.findFirst({
              where: { user_id: sub.user_id, name: origCat.name },
            });

            if (!existingCat) {
              existingCat = await prisma.categories.create({
                data: {
                  user_id: sub.user_id,
                  name: origCat.name,
                  color: origCat.color,
                },
              });
            }

            newCategoryId = existingCat.category_id;
          }
        }

        // створюємо копію задачі для підписника
        await prisma.tasks.create({
          data: {
            user_id: sub.user_id,
            planner_id: updated.planner_id,
            title: updated.title,
            description: updated.description,
            category_id: newCategoryId,
            priority: updated.priority ?? 1,
            status_id: updated.status_id,
            start_time: updated.start_time,
            duration: updated.duration,
            deadline: updated.deadline,
            is_shared: false, // у підписника — своя копія
            is_repeating: updated.is_repeating,
          },
        });
      }
    }

    // 4️⃣ Якщо раніше була спільною, а тепер стала приватною — видаляємо копії у підписників
    if (wasShared && !updated.is_shared && updated.planner_id) {
      const subs = await prisma.plannerSubscription.findMany({
        where: { planner_id: updated.planner_id },
      });

      const subscriberIds = subs
        .map((s) => s.user_id)
        .filter((uid) => uid !== updated.user_id);

      // Видаляємо тільки "клоновані" задачі (у підписників, is_shared = false)
      await prisma.tasks.deleteMany({
        where: {
          planner_id: updated.planner_id,
          user_id: { in: subscriberIds },
          is_shared: false,
          // Невеликий "якорь", щоб не снести чужі задачи,
          // але не слишком строгий (можно добавить при желании start_time/deadline и т.д.)
          title: updated.title,
          description: updated.description,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Помилка оновлення задачі:", err);
    res.status(500).json({ error: "Не вдалося оновити задачу" });
  }
}




// DELETE — видалити задачу. Власник видаляє задачу, а у підписників копії залишаються.

export async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    await prisma.tasks.delete({
      where: { task_id: +id },
    });

    res.json({ message: "Задачу видалено успішно" });
  } catch (err) {
    console.error("❌ Помилка видалення задачі:", err);
    res.status(500).json({ error: "Не вдалося видалити задачу" });
  }
}
