import express from "express";
import prisma from "../utils/prismaClient.js";

const router = express.Router();

// Команди у пам’яті для кожного девайса окремо
let deviceCommands = {};

// Перевірка існування пристрою
async function checkDevice(device_id) {
    const id = Number(device_id);
    if (isNaN(id)) return null;

    return prisma.devices.findUnique({
        where: { device_id: id }
    });
}

// Перевірка — чи онлайн девайс (за last_sync)
function isDeviceOnline(device) {
    const lastSync = new Date(device.last_sync);
    const now = new Date();
    const diffSec = (now - lastSync) / 1000;
    return diffSec <= 5; // 5 секунд — вікно для онлайну
}

/*
 START: запуск фокус-сесії
 POST /devices/:device_id/start
 */
router.post("/:device_id/start", async (req, res) => {
    const { device_id } = req.params;
    const focus = req.body?.focus;
    const br = req.body?.break;

    const device = await checkDevice(device_id);
    if (!device)
        return res.status(404).json({ error: "Пристрій не знайдено" });

    // Перевірка онлайн/офлайн
    if (!isDeviceOnline(device)) {
        return res.status(400).json({
            error: "Пристрій офлайн. Неможливо надіслати команду START."
        });
    }

    if (!focus || !br) {
        return res.status(400).json({ error: "focus і break обов'язкові" });
    }

    deviceCommands[device_id] = { type: "start", focus, break: br };

    await prisma.devices.update({
        where: { device_id: Number(device_id) },
        data: { state: "active", last_sync: new Date() }
    });

    console.log(`➡️ START для девайса #${device_id}`);

    return res.json({ message: `Команда START надіслана девайсу ${device_id}` });
});

/*
 STOP: зупинка пристрою
 POST /devices/:device_id/stop
 */
router.post("/:device_id/stop", async (req, res) => {
    const { device_id } = req.params;

    const device = await checkDevice(device_id);
    if (!device)
        return res.status(404).json({ error: "Пристрій не знайдено" });

    // Перевірка онлайн/офлайн
    if (!isDeviceOnline(device)) {
        return res.status(400).json({
            error: "Пристрій офлайн. Неможливо надіслати команду STOP."
        });
    }

    deviceCommands[device_id] = { type: "stop" };

    await prisma.devices.update({
        where: { device_id: Number(device_id) },
        data: { state: "inactive", last_sync: new Date() }
    });

    console.log(`🛑 STOP для девайса #${device_id}`);

    return res.json({ message: `Команда STOP надіслана девайсу ${device_id}` });
});

/*
 IoT-клієнт забирає команду
 GET /devices/:device_id/command
 */
router.get("/:device_id/command", async (req, res) => {
    const { device_id } = req.params;

    const device = await checkDevice(device_id);
    if (!device)
        return res.status(404).json({ error: "Пристрій не знайдено" });

    const command = deviceCommands[device_id] || { type: "none" };

    // 🔄 Команда одноразова — після видачі очищаємо
    if (command.type !== "none") {
        deviceCommands[device_id] = { type: "none" };
    }

    await prisma.devices.update({
        where: { device_id: Number(device_id) },
        data: { last_sync: new Date() }
    });

    return res.json(command);
});

/*
 IoT-клієнт надсилає статус ("online", "started", "stopped", "offline")
 POST /devices/:device_id/status
 */
router.post("/:device_id/status", async (req, res) => {
    const { device_id } = req.params;
    const status = req.body?.status;

    const device = await checkDevice(device_id);
    if (!device)
        return res.status(404).json({ error: "Пристрій не знайдено" });

    if (!status) {
        return res.status(400).json({ error: "Поле 'status' обов'язкове" });
    }

    console.log(`📡 Девайс #${device_id} підтверджує статус: ${status}`);

    // Обробка offline
    if (status === "offline") {
        await prisma.devices.update({
            where: { device_id: Number(device_id) },
            data: {
                state: "inactive",
                last_sync: new Date(0) // Дуже стара дата → гарантований офлайн
            }
        });

        console.log(`🔌 Девайс #${device_id} вимкнено`);
        return res.json({ message: "Пристрій вимкнено" });
    }

    // Інші статуси (online / started / stopped)
    await prisma.devices.update({
        where: { device_id: Number(device_id) },
        data: { last_sync: new Date() }
    });

    return res.json({ message: "Статус прийнято" });
});

export default router;
