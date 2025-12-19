/**
 * Push Notification Service (готова логічна частина, не підключена)
 * 
 * Логіка підтримує:
 *  - системні push для задач
 *  - push для фокус-сесій
 *  - offline/online push для IoT пристроїв
 *  - денні підсумки
 *  - сповіщення про перевантаження
 * 
 * Але сервіс ще не активований у сервері.
 */

import axios from "axios";

class PushService {
    constructor() {
        this.queue = []; // черга push-повідомлень
        this.isProcessing = false;

        // Абстрактний провайдер (поки не підключено)
        this.provider = {
            async send(deviceToken, title, body, payload = {}) {
                console.log(`🟦 [PUSH MOCK] -> token=${deviceToken}: ${title} — ${body}`);
                console.log("Payload:", payload);

                // Тут буде реальна інтеграція, наприклад:
                //
                // return axios.post("https://fcm.googleapis.com/fcm/send", {
                //     to: deviceToken,
                //     notification: { title, body },
                //     data: payload
                // }, {
                //     headers: { Authorization: `key=${process.env.FCM_KEY}` }
                // });
            }
        };
    }

    /**
     * Додати повідомлення до черги
     */
    enqueue(notification) {
        this.queue.push(notification);
        this.processQueue();
    }

    /**
     * Обробка черги (одне за одним)
     */
    async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const notif = this.queue.shift();
            try {
                await this.provider.send(
                    notif.deviceToken,
                    notif.title,
                    notif.body,
                    notif.payload
                );
            } catch (err) {
                console.error("❌ Помилка надсилання push:", err.message);
            }
        }

        this.isProcessing = false;
    }

    // ---------------------------------------------------------
    // 🔵 Універсальні методи надсилання push-повідомлень
    // ---------------------------------------------------------

    sendTaskReminder(user, task) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Нагадування про задачу",
            body: `Не забудь виконати: ${task.title}`,
            payload: { taskId: task.id, type: "task_reminder" }
        });
    }

    sendFocusSessionStarted(user) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Фокус-сесія розпочата",
            body: "Тримай концентрацію!",
            payload: { type: "focus_start" }
        });
    }

    sendFocusSessionFinished(user) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Фокус-сесію завершено",
            body: "Час відпочити 🚀",
            payload: { type: "focus_end" }
        });
    }

    sendBreakFinished(user) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Перерва завершена",
            body: "Повертаємось до роботи!",
            payload: { type: "break_end" }
        });
    }

    sendDeviceOffline(user, deviceId) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Пристрій недоступний",
            body: `Девайс #${deviceId} перестав відповідати.`,
            payload: { type: "device_offline", deviceId }
        });
    }

    sendDeviceOnline(user, deviceId) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Пристрій онлайн",
            body: `Девайс #${deviceId} тепер у мережі.`,
            payload: { type: "device_online", deviceId }
        });
    }

    sendOverloadWarning(user, overloadCount) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Перевантаження",
            body: `У тебе було ${overloadCount} дуже важких днів. Переглянь баланс.`,
            payload: { type: "overload_warning" }
        });
    }

    sendDailySummary(user, stats) {
        this.enqueue({
            deviceToken: user.device_token,
            title: "Щоденний підсумок",
            body: `Виконано задач: ${stats.completedPercent}%`,
            payload: {
                type: "daily_summary",
                completed: stats.completedPercent,
                overload: stats.overloadDays
            }
        });
    }
}

export default new PushService();
