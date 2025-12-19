import prisma from "../src/utils/prismaClient.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Початок заповнення бази даних...");

  // --- Створюємо користувачів ---
  const passwordHash = await bcrypt.hash("12345", 10);

  const user1 = await prisma.users.create({
    data: {
      email: "alex@example.com",
      password_hash: passwordHash,
      name: "Олександр",
      last_name: "Годун",
      birth_date: new Date("2001-07-15"),
    },
  });

  const user2 = await prisma.users.create({
    data: {
      email: "maria@example.com",
      password_hash: passwordHash,
      name: "Марія",
      last_name: "Іваненко",
      birth_date: new Date("2000-03-20"),
    },
  });

  console.log("✅ Користувачі створені:", user1.user_id, user2.user_id);

  // --- Створюємо категорії ---
  const workCat = await prisma.categories.create({
    data: { user_id: user1.user_id, name: "Робота", color: "#FF6B00" },
  });
  const studyCat = await prisma.categories.create({
    data: { user_id: user1.user_id, name: "Навчання", color: "#0091FF" },
  });

  console.log("✅ Категорії створені");

  // --- Створюємо статуси ---
  const statusTodo = await prisma.statuses.create({
    data: { name: "Не виконано", description: "Завдання ще не розпочато" },
  });
  const statusDone = await prisma.statuses.create({
    data: { name: "Виконано", description: "Завдання завершене" },
  });

  console.log("✅ Статуси створені");

  // --- Створюємо тестовий планерник ---
  const planner = await prisma.planner.create({
    data: {
      name: "Командний планерник",
      owner_id: user1.user_id,
      is_public: true,
    },
  });

  console.log("✅ Планерник створений");

  // --- Додаємо підписку ---
  await prisma.plannerSubscription.create({
    data: {
      planner_id: planner.planner_id,
      user_id: user2.user_id,
      role: "USER",
    },
  });

  console.log("✅ Підписка додана");

  // --- Створюємо задачі ---
  await prisma.tasks.create({
    data: {
      user_id: user1.user_id,
      planner_id: planner.planner_id,
      title: "Розробити API для задач",
      description: "Закінчити реалізацію CRUD логіки",
      category_id: workCat.category_id,
      status_id: statusTodo.status_id,
      priority: 2,
      start_time: new Date(),
      duration: 90,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // через 3 дні
      is_shared: true,
      is_repeating: false,
    },
  });

  await prisma.tasks.create({
    data: {
      user_id: user1.user_id,
      title: "Пройти курс з Prisma",
      description: "Оновити знання по ORM та MySQL",
      category_id: studyCat.category_id,
      status_id: statusDone.status_id,
      priority: 1,
      start_time: new Date(),
      duration: 120,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_shared: false,
      is_repeating: true, // 🔁 повторюване завдання
    },
  });

  console.log("✅ Задачі створені");

  // --- Створюємо статистику ---
  await prisma.statistics.create({
    data: {
      user_id: user1.user_id,
      period: "2025-Q1",
      completed_percent: 85.5,
      overload_days: 2,
      category_balance: 0.9,
      recommendation_text: "Зберігайте баланс між роботою та відпочинком 💡",
    },
  });

  console.log("✅ Статистика додана");

  // --- Створюємо тестовий пристрій (IoT) ---
  await prisma.devices.create({
    data: {
      user_id: user1.user_id,
      esp_id: "ESP32-PLANNER-001",
      state: "active",
    },
  });

  console.log("✅ IoT пристрій створений");

  console.log("🌿 Заповнення завершено успішно!");
}

// --- Запуск ---
main()
  .catch((e) => {
    console.error("❌ Помилка при заповненні:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
