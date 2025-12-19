// Поточний стан IoT-пристрою
export let deviceState = {
    device_id: null,       // Ідентифікатор пристрою
    running: false,        // Чи активний цикл
    stopRequested: false,  // Чи треба зупинити
    focusDuration: 0,      // Тривалість фокус-сесії (мс)
    breakDuration: 0       // Тривалість перерви (мс)
};

// Оновлення стану
export function updateState(data) {
    Object.assign(deviceState, data);
}
 