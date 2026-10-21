document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    setupTabs();
    setupWellControls();
    setupBatteryControls();
    renderWellTabs();
    syncSlidersToActiveWell();
    updateUI();

    setInterval(() => {
        const totals = stepSimulationHour();
        updateUI(totals);
    }, 1500);
});

function setupTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
}

function renderWellTabs() {
    const container = document.getElementById('wellTabs');
    container.innerHTML = '';
    gameState.wells.forEach((well, idx) => {
        const btn = document.createElement('button');
        btn.className = 'well-tab' +
            (idx === gameState.selectedWellIndex ? ' active' : '') +
            (well.sandedOff ? ' tripped' : '');
        btn.innerText = `Well ${well.id}`;
        btn.onclick = () => {
            gameState.selectedWellIndex = idx;
            renderWellTabs();
            syncSlidersToActiveWell();
            updateUI();
        };
        container.appendChild(btn);
    });
}

function syncSlidersToActiveWell() {
    const well = gameState.wells[gameState.selectedWellIndex];
    if (!well) return;
    document.getElementById('rpmSlider').value = well.rpm;
    document.getElementById('rpmVal').innerText = `${well.rpm} RPM`;
    document.getElementById('diluentSlider').value = well.diluent;
    document.getElementById('diluentVal').innerText = `${well.diluent.toFixed(1)} m³/d`;

    document.getElementById('tempSlider').value = gameState.battery.treaterTemp;
    document.getElementById('tempVal').innerText = `${gameState.battery.treaterTemp} °C`;
    document.getElementById('chemSlider').value = gameState.battery.chemPpm;
    document.getElementById('chemVal').innerText = `${gameState.battery.chemPpm} ppm`;
}

function setupWellControls() {
    document.getElementById('rpmSlider').oninput = (e) => {
        const well = gameState.wells[gameState.selectedWellIndex];
        if (well.sandedOff) return;
        well.rpm = parseFloat(e.target.value);
        document.getElementById('rpmVal').innerText = `${well.rpm} RPM`;
    };

    document.getElementById('diluentSlider').oninput = (e) => {
        const well = gameState.wells[gameState.selectedWellIndex];
        well.diluent = parseFloat(e.target.value);
        document.getElementById('diluentVal').innerText = `${well.diluent.toFixed(1)} m³/d`;
    };

    document.getElementById('btnFlushby').onclick = () => {
        const well = gameState.wells[gameState.selectedWellIndex];
        if (!well.sandedOff) { addLog(`Well ${well.id} pump is already turning freely.`, 'warn'); updateUI(); return; }
        if (gameState.cash < 2500) { addLog('Insufficient funds for flushby rig ($2,500).', 'crit'); updateUI(); return; }
        gameState.cash -= 2500;
        well.sandedOff = false;
        well.torque = 35;
        well.rpm = 85;
        syncSlidersToActiveWell();
        renderWellTabs();
        addLog(`Flushby cleared sand bridge on Well ${well.id}. Back online at 85 RPM.`, 'warn');
        saveGame();
        updateUI();
    };

    document.getElementById('btnDrillWell').onclick = () => {
        if (gameState.cash < 45000) {
            addLog('Need $45,000 capital to drill and equip a new CHOPS well.', 'warn');
            updateUI();
            return;
        }
        gameState.cash -= 45000;
        const nextNum = String(gameState.wells.length + 1).padStart(2, '0');
        gameState.wells.push({
            id: `${nextNum}-19`,
            rpm: 100,
            diluent: 2.0,
            waterCut: 24 + Math.floor(Math.random() * 10),
            sandCut: 3.0,
            torque: 40,
            sandedOff: false,
            grossDaily: 38.0
        });
        gameState.selectedWellIndex = gameState.wells.length - 1;
        addLog(`Drilled and completed new PCP Well ${nextNum}-19! (-$45,000)`, '');
        renderWellTabs();
        syncSlidersToActiveWell();
        saveGame();
        updateUI();
    };
}

function setupBatteryControls() {
    document.getElementById('tempSlider').oninput = (e) => {
        gameState.battery.treaterTemp = parseFloat(e.target.value);
        document.getElementById('tempVal').innerText = `${gameState.battery.treaterTemp} °C`;
    };

    document.getElementById('chemSlider').oninput = (e) => {
        gameState.battery.chemPpm = parseFloat(e.target.value);
        document.getElementById('chemVal').innerText = `${gameState.battery.chemPpm} ppm`;
    };

    document.getElementById('btnShipOil').onclick = () => {
        const bat = gameState.battery;
        if (bat.oilTank < 15) {
            addLog('Minimum 15 m³ required to book crude hauler.', 'warn');
            updateUI();
            return;
        }
        if (bat.bsw > 0.5) {
            gameState.cash -= 1200;
            addLog(`LOAD REJECTED at terminal! BS&W ${bat.bsw.toFixed(2)}% > 0.50%. Charged $1,200 recycle fee.`, 'crit');
            updateUI();
            return;
        }
        const bbls = bat.oilTank * 6.2898;
        const rev = Math.round(bbls * gameState.wcsPrice);
        gameState.cash += rev;
        addLog(`Shipped ${bat.oilTank.toFixed(1)} m³ clean oil (+$${rev.toLocaleString()}).`);
        bat.oilTank = 0;
        saveGame();
        updateUI();
    };

    document.getElementById('btnVacTruck').onclick = () => {
        if (gameState.cash < 800) { addLog('Insufficient funds for vac truck ($800).', 'warn'); updateUI(); return; }
        gameState.cash -= 800;
        gameState.battery.sandTank = 0;
        addLog('Vac truck cleaned out desander vessel (-$800).');
        saveGame();
        updateUI();
    };

    document.getElementById('btnForceSave').onclick = () => {
        saveGame();
        addLog('Manual state checkpoint saved to device storage.');
        updateUI();
    };

    document.getElementById('btnResetGame').onclick = () => {
        if (confirm('Wipe current field progress and restart with $25,000?')) {
            resetGame();
            renderWellTabs();
            syncSlidersToActiveWell();
            updateUI();
        }
    };
}

function updateUI(totals = null) {
    document.getElementById('topCash').innerText = '$' + gameState.cash.toLocaleString();
    document.getElementById('wcsPrice').innerText = gameState.wcsPrice.toFixed(2);
    document.getElementById('simHours').innerText = gameState.simHours;

    const well = gameState.wells[gameState.selectedWellIndex];
    if (well) {
        document.getElementById('wellGross').innerText = `${well.grossDaily.toFixed(1)} m³/d`;
        document.getElementById('wellWc').innerText = well.waterCut.toFixed(0);
        document.getElementById('wellSand').innerText = well.sandCut.toFixed(1);
        document.getElementById('wellTorque').innerText = `${well.torque.toFixed(0)}%`;

        const tBar = document.getElementById('torqueBar');
        tBar.style.width = `${Math.min(100, well.torque)}%`;
        tBar.style.background = well.torque > 80 ? 'var(--red)' : (well.torque > 60 ? 'var(--accent)' : 'var(--green)');

        const statusEl = document.getElementById('wellStatus');
        statusEl.innerText = well.sandedOff ? 'STATUS: SANDED OFF (TRIP)' : 'Status: Running';
        statusEl.style.color = well.sandedOff ? 'var(--red)' : 'var(--muted)';
    }

    const bat = gameState.battery;
    const padGross = totals ? totals.totalGrossDaily : gameState.wells.reduce((s, w) => s + w.grossDaily, 0);
    const padNet = totals ? totals.totalNetOilDaily : padGross * 0.7;

    document.getElementById('batGross').innerText = `${padGross.toFixed(1)} m³/d`;
    document.getElementById('batNetOil').innerText = padNet.toFixed(1);
    document.getElementById('bswDisplay').innerText = `${bat.bsw.toFixed(2)}%`;
    document.getElementById('bswDisplay').style.color = bat.bsw > 0.5 ? 'var(--red)' : 'var(--green)';

    document.getElementById('oilTank').innerText = bat.oilTank.toFixed(1);
    document.getElementById('oilTankBar').style.width = `${(bat.oilTank / 150) * 100}%`;
    document.getElementById('sandTank').innerText = bat.sandTank.toFixed(1);
    document.getElementById('sandTankBar').style.width = `${(bat.sandTank / 25) * 100}%`;
    document.getElementById('waterTank').innerText = bat.waterTank.toFixed(1);

    const logEl = document.getElementById('scadaLog');
    logEl.innerHTML = gameState.logs.map(l =>
        `<div class="log-entry ${l.type}">[${l.time}] ${l.msg}</div>`
    ).join('');

    renderWellTabs();
}
