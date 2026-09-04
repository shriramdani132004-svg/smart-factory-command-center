// app.js - consolidated (Phase 5-14)

let simulationInterval = null;
let tickCount = 0;
const eventFeed = [];
const MAX_FEED_ITEMS = 15;

window.onerror = function (msg, url, line, col, err) {
    console.error('GLOBAL ERROR:', msg, 'at', url + ':' + line + ':' + col, err);
};

function safeInit(name, fn) {
    try { fn(); } catch (err) { console.error('Init step failed [' + name + ']:', err); }
}

function logEvent(text) {
    const time = new Date().toLocaleTimeString('en-GB');
    eventFeed.unshift(time + '  ' + text);
    if (eventFeed.length > MAX_FEED_ITEMS) eventFeed.pop();
}

function renderKPIs(state) {
    try {
        const k = state.kpis;
        document.getElementById('kpi-total').textContent = k.totalMachines;
        document.getElementById('kpi-running').textContent = k.running;
        document.getElementById('kpi-idle').textContent = k.idle;
        document.getElementById('kpi-fault').textContent = k.fault;
        document.getElementById('kpi-offline').textContent = k.offline;
        document.getElementById('kpi-alerts').textContent = k.activeAlerts;
        document.getElementById('kpi-production').textContent = k.productionToday.toLocaleString();
        document.getElementById('kpi-rate').textContent = k.productionRate;
        document.getElementById('kpi-efficiency').textContent = k.efficiency + '%';
        document.getElementById('kpi-energy').textContent = k.energyConsumption + ' kWh';
        document.getElementById('kpi-orders').textContent = k.activeOrders;
        document.getElementById('last-update').textContent = 'Last Update: ' + (state.lastUpdate ? state.lastUpdate.toLocaleTimeString('en-GB') : '--:--:--');
    } catch (err) {
        console.error('renderKPIs failed:', err);
    }
}

function renderEventFeed() {
    const feedEl = document.getElementById('event-feed');
    if (!feedEl) return;
    feedEl.innerHTML = eventFeed.map(e => '<div class="feed-item">' + e + '</div>').join('');
}

function detectEvents(prevStatuses, newMachines) {
    newMachines.forEach((m, i) => {
        const prevStatus = prevStatuses[i];
        if (prevStatus === undefined) return;
        if (prevStatus !== m.currentStatus) {
            logEvent(m.machineId + ' status changed: ' + prevStatus + ' -> ' + m.currentStatus);
        }
        if (m.currentStatus === 'FAULT' && prevStatus !== 'FAULT') {
            logEvent(m.machineId + ' CRITICAL: fault detected');
        }
    });
}

function onSimulationTick(machines) {
    try {
        tickCount++;
        const prevStatuses = machines.map(m => m._prevStatus);
        updateState(machines);
        detectEvents(prevStatuses, machines);
        if (typeof analyzeAllMachines === 'function') analyzeAllMachines(machines);
        machines.forEach(m => { m._prevStatus = m.currentStatus; });

        if (typeof recordSensorHistory === 'function') {
            machines.forEach(m => recordSensorHistory(m));
        }
        if (tickCount % 5 === 0 && typeof runPredictiveAnalysis === 'function') {
            runPredictiveAnalysis(machines);
            if (typeof renderPredictivePanel === 'function') renderPredictivePanel(machines);
        }

        renderKPIs(FactoryState);
        renderEventFeed();
        if (typeof renderFactoryFloor === 'function') renderFactoryFloor(FactoryState.machines);
        if (typeof updateOrderProgress === 'function') updateOrderProgress();
        if (typeof renderOrdersPanel === 'function') renderOrdersPanel();
        if (typeof currentDetailMachineId !== 'undefined' && currentDetailMachineId && typeof renderMachineDetail === 'function') {
            renderMachineDetail(currentDetailMachineId);
        }
    } catch (err) {
        console.error('onSimulationTick failed:', err);
    }
}

function randomizeSomeMachinesRunning(machines) {
    machines.forEach(m => {
        const r = Math.random();
        if (r < 0.8) m.currentStatus = 'RUNNING';
        else if (r < 0.9) m.currentStatus = 'IDLE';
        else m.currentStatus = 'STOPPED';
        m._prevStatus = m.currentStatus;
    });
}

function initApp() {
    console.log('Initializing app...');

    safeInit('machineData', () => {
        MACHINES.forEach(initMachineData);
        randomizeSomeMachinesRunning(MACHINES);
        initState(MACHINES);
    });

    safeInit('eventFeedInit', () => {
        logEvent('Factory simulation initialized with ' + MACHINES.length + ' machines');
        renderKPIs(FactoryState);
        renderEventFeed();
    });

    safeInit('factoryFloor', () => {
        if (typeof initFactoryFloorControls === 'function') initFactoryFloorControls(MACHINES);
        if (typeof renderFactoryFloor === 'function') renderFactoryFloor(MACHINES);
    });

    safeInit('machineDetailControls', () => {
        if (typeof initMachineDetailControls === 'function') initMachineDetailControls();
    });

    safeInit('alertEngine', () => {
        if (typeof initAlertEngine === 'function') initAlertEngine();
        if (typeof renderAlertsPanel === 'function') renderAlertsPanel();
    });

    safeInit('incidentEngine', () => {
        if (typeof initIncidentEngine === 'function') initIncidentEngine();
        if (typeof renderIncidentsPanel === 'function') renderIncidentsPanel();
    });

    safeInit('automationEngine', () => {
        if (typeof initAutomationEngine === 'function') initAutomationEngine();
    });

    safeInit('orderForm', () => {
        if (typeof initOrderForm === 'function') initOrderForm();
        if (typeof renderOrdersPanel === 'function') renderOrdersPanel();
    });

    safeInit('predictiveInit', () => {
        if (typeof renderPredictivePanel === 'function') renderPredictivePanel(MACHINES);
    });

    simulationInterval = startSimulation(MACHINES, onSimulationTick);
    console.log('Simulation started. Interval ID:', simulationInterval);
}

document.addEventListener('DOMContentLoaded', initApp);
