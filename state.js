const SAVE_KEY = 'heavy_oil_sim_save_v1';

function createDefaultState() {
    return {
        cash: 25000,
        wcsPrice: 58.0,
        simHours: 0,
        selectedWellIndex: 0,
        lastSavedAt: Date.now(),
        battery: {
            treaterTemp: 68,
            chemPpm: 150,
            oilTank: 12.0,
            sandTank: 1.2,
            waterTank: 4.5,
            bsw: 0.35
        },
        wells: [
            {
                id: '01-19',
                rpm: 120,
                diluent: 2.0,
                waterCut: 28,
                sandCut: 3.5,
                torque: 42,
                sandedOff: false,
                grossDaily: 45.6
            },
            {
                id: '02-19',
                rpm: 95,
                diluent: 1.5,
                waterCut: 34,
                sandCut: 2.8,
                torque: 36,
                sandedOff: false,
                grossDaily: 36.1
            }
        ],
        logs: [
            { time: '00:00:00', msg: 'SCADA Historian initialized. Pad 04-19 online.', type: '' }
        ]
    };
}

let gameState = createDefaultState();

function saveGame() {
    try {
        gameState.lastSavedAt = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        const el = document.getElementById('lastSaveTime');
        if (el) el.innerText = new Date().toLocaleTimeString([], { hour12: false });
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        gameState = Object.assign(createDefaultState(), parsed);
    } catch (e) {
        console.error('Load failed, using defaults:', e);
        gameState = createDefaultState();
    }
}

function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    gameState = createDefaultState();
    addLog('Field state reset to initial commissioning parameters.', 'warn');
}

function addLog(msg, type = '') {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    gameState.logs.unshift({ time, msg, type });
    if (gameState.logs.length > 60) gameState.logs.pop();
}
