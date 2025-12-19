import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { updateState, deviceState } from "./iotState.js";
import { runFocusCycle } from "./iotLogic.js";

const SERVER = "http://localhost:5000";

// Читаємо device_id з аргументів командного рядка
const argv = yargs(hideBin(process.argv)).argv;
const device_id = argv.device;

if (!device_id) {
    console.error("❌ Не вказано device_id. Запуск: node iotClient.js --device=1");
    process.exit(1);
}

console.log(`🔌 IoT-клієнт стартує як девайс #${device_id} ...`);

/*
 * Перевірка існування пристрою в БД
 */
async function checkDeviceExists() {
    try {
        const res = await axios.get(`${SERVER}/devices/${device_id}`);
        console.log(`✔ Пристрій знайдено: ESP_ID = ${res.data.esp_id}`);

        // Відправляємо статус "online"
        await axios.post(`${SERVER}/devices/${device_id}/status`, {
            status: "online"
        });

    } catch (err) {
        console.error("❌ Пристрій не знайдено в БД. Завершення роботи.");
        process.exit(1);
    }
}

/*
 * Оновлення стану на сервері
 */
async function updateServerState(state) {
    try {
        await axios.patch(`${SERVER}/devices/${device_id}`, {
            state: state
        });
        console.log(`📡 Стан девайса #${device_id} оновлено на: ${state}`);
    } catch (err) {
        console.log("⚠ Не вдалося оновити стан на сервері:", err.message);
    }
}

/*
 * Основний цикл опитування команд
 */
async function pollCommands() {
    console.log("📡 IoT-клієнт очікує команд...");

    setInterval(async () => {
        try {
            const res = await axios.get(`${SERVER}/devices/${device_id}/command`);
            const cmd = res.data;

            // START
            if (cmd.type === "start" && !deviceState.running) {

                updateState({
                    focusDuration: cmd.focus * 1000,
                    breakDuration: cmd.break * 1000
                });

                console.log("🚀 Команда START отримана → запускаю цикл");

                await updateServerState("active");

                // Відправляємо підтвердження
                await axios.post(`${SERVER}/devices/${device_id}/status`, {
                    status: "started"
                });

                runFocusCycle().then(async () => {
                    console.log("🔚 Цикл завершено. Оновлюємо стан на inactive...");
                    await updateServerState("inactive");

                    await axios.post(`${SERVER}/devices/${device_id}/status`, {
                        status: "cycle_finished"
                    });
                });
            }

            // STOP
            if (cmd.type === "stop") {
                console.log("🛑 Команда STOP отримана");
                updateState({ stopRequested: true });

                await updateServerState("inactive");

                await axios.post(`${SERVER}/devices/${device_id}/status`, {
                    status: "stopped"
                });
            }

        } catch (err) {
            console.log("❌ Помилка зв’язку з сервером:", err.message);
        }
    }, 2000);
}

/*
 * 🛑 Обробка вимкнення пристрою (Ctrl + C)
 * При виході клієнт автоматично відправляє статус offline
 */
process.on("SIGINT", async () => {
    console.log("\n🔌 IoT-клієнт вимикається...");

    try {
        await axios.post(`${SERVER}/devices/${device_id}/status`, {
            status: "offline"
        });

        // Робимо пристрій офлайн миттєво
        await axios.patch(`${SERVER}/devices/${device_id}`, {
            state: "inactive"
        });

        console.log(`🛑 Девайс #${device_id} вимкнено`);
    } catch (e) {
        console.log("⚠ Не вдалося надіслати статус OFFLINE");
    }

    process.exit(0);
});

// Запускаємо клієнт
await checkDeviceExists();
pollCommands();
 