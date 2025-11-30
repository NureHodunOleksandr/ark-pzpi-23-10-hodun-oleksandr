import prisma from "../utils/prismaClient.js";

// Створити новий планерник

export async function createPlanner(req, res) {
  try {
    const { name, owner_id } = req.body;

    const planner = await prisma.planner.create({
      data: {
        name,
        owner_id: Number(owner_id),
        is_public: true,
        subscribers: {
          create: {
            user_id: Number(owner_id),
            role: "OWNER",
          },
        },
      },
    });

    res.status(201).json(planner);
  } catch (err) {
    console.error("❌ Помилка створення планерника:", err);
    res.status(500).json({ error: "Не вдалося створити планерник" });
  }
}

// Отримати всі планерники

export async function getPlanners(req, res) {
  try {
    const planners = await prisma.planner.findMany({
      include: {
        subscribers: {
          include: { user: true },
        },
      },
    });
    res.json(planners);
  } catch (err) {
    console.error("❌ Помилка отримання планерників:", err);
    res.status(500).json({ error: "Не вдалося отримати планерники" });
  }
}

// Підписатися на планерник

export async function subscribeToPlanner(req, res) {
  try {
    const { planner_id, user_id } = req.body;

    const existing = await prisma.plannerSubscription.findFirst({
      where: { planner_id: +planner_id, user_id: +user_id },
    });
    if (existing)
      return res.status(400).json({ message: "Ви вже підписані на цей планерник" });

    const subscription = await prisma.plannerSubscription.create({
      data: {
        planner_id: +planner_id,
        user_id: +user_id,
        role: "USER",
      },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error("❌ Помилка підписки:", err);
    res.status(500).json({ error: "Не вдалося підписатися" });
  }
}

// Відписатися від планерника
export async function unsubscribeFromPlanner(req, res) {
  try {
    const { planner_id, user_id } = req.body;

    // Удаляем запись о подписке
    await prisma.plannerSubscription.deleteMany({
      where: { planner_id: +planner_id, user_id: +user_id },
    });

    // Удаляем задачи, которые были скопированы этому пользователю
    await prisma.tasks.deleteMany({
      where: {
        planner_id: +planner_id,
        user_id: +user_id,
        is_shared: false, // чтобы не удалить задачи владельца
      },
    });

    res.json({ message: "Ви відписалися від планерника, копії задач видалено" });
  } catch (err) {
    console.error("❌ Помилка відписки:", err);
    res.status(500).json({ error: "Не вдалося відписатися" });
  }
}


// Отримати список підписників планерника

export async function getPlannerSubscribers(req, res) {
  try {
    const { id } = req.params;

    const subscribers = await prisma.plannerSubscription.findMany({
      where: { planner_id: +id },
      include: { user: true },
    });

    res.json(subscribers);
  } catch (err) {
    console.error("❌ Помилка отримання підписників:", err);
    res.status(500).json({ error: "Не вдалося отримати підписників" });
  }
}

// Змінити роль підписника (ADMIN / USER)

export async function updateSubscriberRole(req, res) {
  try {
    const { planner_id, user_id, role } = req.body;

    const updated = await prisma.plannerSubscription.updateMany({
      where: { planner_id: +planner_id, user_id: +user_id },
      data: { role },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Помилка оновлення ролі:", err);
    res.status(500).json({ error: "Не вдалося оновити роль" });
  }
}

// Отримати всі планерники користувача (на які він підписаний)

export async function getUserSubscriptions(req, res) {
  try {
    const { user_id } = req.params;

    const subscriptions = await prisma.plannerSubscription.findMany({
      where: { user_id: +user_id },
      include: {
        planner: true,
      },
    });

    res.json(subscriptions);
  } catch (err) {
    console.error("❌ Помилка отримання підписок користувача:", err);
    res.status(500).json({ error: "Не вдалося отримати підписки" });
  }
}
