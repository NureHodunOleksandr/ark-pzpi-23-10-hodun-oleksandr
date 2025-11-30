import { deviceState, updateState } from "./iotState.js";

// Проста функція таймера
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Основний фокус-цикл: фокус → перерва → фокус → ...
export async function runFocusCycle() {
    console.log("▶️ Цикл фокус-сесії запущено");

    updateState({
        running: true,
        stopRequested: false
    });

    try {
        while (!deviceState.stopRequested) {

            // --- ФОКУС ---
            console.log(`💡 Фокус-сесія: ${deviceState.focusDuration / 1000} сек`);
            await wait(deviceState.focusDuration);

            if (deviceState.stopRequested) break;

            // --- ПЕРЕРВА ---
            console.log(`🔔 Перерва: ${deviceState.breakDuration / 1000} сек`);
            await wait(deviceState.breakDuration);
        }

    } finally {
        updateState({ running: false });
        console.log("⛔ Цикл завершено");
    }
}
