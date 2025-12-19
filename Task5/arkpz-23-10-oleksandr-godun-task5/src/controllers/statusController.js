import prisma from "../utils/prismaClient.js";

// CREATE — створити статус
export async function createStatus(req, res) {
  try {
    const { name, description } = req.body;
    const status = await prisma.statuses.create({  // ← тут statuses
      data: { name, description },
    });
    res.status(201).json(status);
  } catch (err) {
    console.error("Помилка створення статусу:", err);
    res.status(500).json({ error: "Не вдалося створити статус" });
  }
}

// READ — отримати всі статуси
export async function getStatuses(req, res) {
  try {
    const statuses = await prisma.statuses.findMany();  // ← тут statuses
    res.json(statuses);
  } catch (err) {
    console.error("Помилка отримання статусів:", err);
    res.status(500).json({ error: "Не вдалося отримати статуси" });
  }
}

// UPDATE — оновити статус
export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const status = await prisma.statuses.update({  // ← тут statuses
      where: { status_id: parseInt(id) },
      data: { name, description },
    });
    res.json(status);
  } catch (err) {
    console.error("Помилка оновлення статусу:", err);
    res.status(500).json({ error: "Не вдалося оновити статус" });
  }
}

// DELETE — видалити статус
export async function deleteStatus(req, res) {
  try {
    const { id } = req.params;
    await prisma.statuses.delete({  // ← тут statuses
      where: { status_id: parseInt(id) },
    });
    res.json({ message: "Статус видалено" });
  } catch (err) {
    console.error("Помилка видалення статусу:", err);
    res.status(500).json({ error: "Не вдалося видалити статус" });
  }
}
