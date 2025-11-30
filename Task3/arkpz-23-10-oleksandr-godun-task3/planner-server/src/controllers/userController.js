import prisma from "../utils/prismaClient.js";
import bcrypt from "bcryptjs";

// Фільтрація для скривання хєш-паролю при відправки відповіді
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

/*
CREATE — створення нового користувача
Пароль хешується перед збереженням.
Тепер підтримуються поля last_name та birth_date.
*/
export async function createUser(req, res) {
  try {
    const { email, password, name, last_name, birth_date } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Необхідно вказати email, пароль і ім’я" });
    }

    // Хешування пароля
    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        email,
        password_hash,
        name,
        last_name: last_name || null,
        birth_date: birth_date ? new Date(birth_date) : null,
      },
    });

  res.status(201).json(sanitizeUser(user));
  } catch (err) {
    console.error("❌ Помилка створення користувача:", err);
    res.status(500).json({ error: "Помилка створення користувача" });
  }
}

// READ — отримати список усіх користувачів

export async function getUsers(req, res) {
  try {
    const users = await prisma.users.findMany({
      orderBy: { user_id: "asc" },
    });
    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error("❌ Помилка отримання користувачів:", err);
    res.status(500).json({ error: "Не вдалося отримати користувачів" });
  }
}

// UPDATE — оновлення користувача Дозволяє редагувати ім’я, прізвище та дату народження.

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, last_name, birth_date } = req.body;

    const user = await prisma.users.update({
      where: { user_id: parseInt(id) },
      data: {
        name: name || undefined,
        last_name: last_name || undefined,
        birth_date: birth_date ? new Date(birth_date) : undefined,
      },
    });

    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error("❌ Помилка оновлення користувача:", err);
    res.status(500).json({ error: "Помилка оновлення користувача" });
  }
}

// DELETE — видалення користувача

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    await prisma.users.delete({
      where: { user_id: parseInt(id) },
    });

    res.json({ message: "Користувача успішно видалено" });
  } catch (err) {
    console.error("❌ Помилка видалення користувача:", err);
    res.status(500).json({ error: "Не вдалося видалити користувача" });
  }
}
