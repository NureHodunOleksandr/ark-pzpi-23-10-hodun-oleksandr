import prisma from "../utils/prismaClient.js";

// CREATE — створити пристрій
export async function createDevice(req, res) {
  try {
    const { user_id, esp_id, state } = req.body;
    const device = await prisma.devices.create({
      data: { user_id: +user_id, esp_id, state },
    });
    res.status(201).json(device);
  } catch (err) {
    console.error("Помилка створення пристрою:", err);
    res.status(500).json({ error: "Не вдалося створити пристрій" });
  }
}

// READ — отримати всі пристрої
export async function getDevices(req, res) {
  try {
    const devices = await prisma.devices.findMany({
      include: { users: true },
    });
    res.json(devices);
  } catch (err) {
    console.error("Помилка отримання пристроїв:", err);
    res.status(500).json({ error: "Не вдалося отримати пристрої" });
  }
}

// READ — отримати один пристрій
export async function getDevice(req, res) {
  try {
    const { id } = req.params;

    const device = await prisma.devices.findUnique({
      where: { device_id: +id }
    });

    if (!device) {
      return res.status(404).json({ error: "Пристрій не знайдено" });
    }

    res.json(device);

  } catch (err) {
    console.error("Помилка отримання пристрою:", err);
    res.status(500).json({ error: "Не вдалося отримати пристрій" });
  }
}

// UPDATE — оновити пристрій
export async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const { state } = req.body;
    const device = await prisma.devices.update({
      where: { device_id: +id },
      data: { state },
    });
    res.json(device);
  } catch (err) {
    console.error("Помилка оновлення пристрою:", err);
    res.status(500).json({ error: "Не вдалося оновити пристрій" });
  }
}

// DELETE — видалити пристрій
export async function deleteDevice(req, res) {
  try {
    const { id } = req.params;
    await prisma.devices.delete({
      where: { device_id: +id },
    });
    res.json({ message: "Пристрій видалено" });
  } catch (err) {
    console.error("Помилка видалення пристрою:", err);
    res.status(500).json({ error: "Не вдалося видалити пристрій" });
  }
}
