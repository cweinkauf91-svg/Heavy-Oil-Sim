function stepSimulationHour() {
    gameState.simHours += 1;

    let totalGrossDaily = 0;
    let totalNetOilDaily = 0;
    let totalSandDaily = 0;
    let totalWaterDaily = 0;
    let hourlyOpex = 0;

    gameState.wells.forEach((well) => {
        let sandInflux = (well.rpm / 100) * 2.2 + (Math.random() * 1.4);
        well.sandCut = well.rpm > 0 ? Math.min(18, Math.max(0.5, sandInflux)) : 0;

        let viscosityFactor = Math.max(0.4, 1.3 - (well.diluent * 0.07));
        let targetTorque = (well.rpm * 0.28 * viscosityFactor) + (well.sandCut * 3.2);

        if (!well.sandedOff) {
            well.torque = well.rpm === 0 ? 0 : Math.min(105, Math.max(10, targetTorque + (Math.random() * 4 - 2)));
            if (well.torque >= 98) {
                well.sandedOff = true;
                well.rpm = 0;
                addLog(`HIGH TORQUE TRIP on Well ${well.id}! PCP sanded off.`, 'crit');
            }
        } else {
            well.torque = 100;
        }

        let wormholeFactor = well.sandCut > 2.0 ? 1.08 : 1.0;
        well.grossDaily = well.sandedOff ? 0 : (well.rpm * 0.38 * wormholeFactor);

        let netOil = well.grossDaily * (1 - (well.waterCut / 100)) * (1 - (well.sandCut / 100));
        let sandVol = well.grossDaily * (well.sandCut / 100);
        let waterVol = well.grossDaily * (well.waterCut / 100);

        totalGrossDaily += well.grossDaily;
        totalNetOilDaily += netOil;
        totalSandDaily += sandVol;
        totalWaterDaily += waterVol;

        hourlyOpex += (well.diluent * 7.5) + (well.rpm * 0.04);
    });

    const bat = gameState.battery;
    if (bat.oilTank < 150 && bat.sandTank < 25) {
        bat.oilTank = Math.min(150, bat.oilTank + (totalNetOilDaily / 24));
        bat.sandTank = Math.min(25, bat.sandTank + (totalSandDaily / 24));
        bat.waterTank += (totalWaterDaily / 24);
    } else {
        let trippedAny = false;
        gameState.wells.forEach(w => {
            if (w.rpm > 0) { w.rpm = 0; trippedAny = true; }
        });
        if (trippedAny) {
            addLog('BATTERY HIGH-HIGH LEVEL ESD! All wellhead drives shut in.', 'crit');
        }
    }

    let tempEff = (bat.treaterTemp - 40) * 0.015;
    let chemEff = bat.chemPpm * 0.002;
    let rawBsw = 1.65 - tempEff - chemEff + (totalGrossDaily * 0.0025);
    bat.bsw = Math.max(0.12, rawBsw);

    hourlyOpex += (bat.chemPpm * 0.08) + ((bat.treaterTemp - 40) * 0.25);
    gameState.cash -= Math.round(hourlyOpex);

    if (gameState.simHours % 12 === 0) {
        let drift = (Math.random() - 0.49) * 1.2;
        gameState.wcsPrice = Math.min(78, Math.max(38, gameState.wcsPrice + drift));
    }

    if (gameState.simHours % 4 === 0) {
        saveGame();
    }

    return { totalGrossDaily, totalNetOilDaily };
}
