// app.js
// Main application entry point - wires simulator -> state -> dashboard -> factory floor (Phase 5 + 6)

let simulationInterval = null;
const eventFeed = [];
const MAX_FEED_ITEMS = 15;

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
        const prevStatuses = machines.map(m => m._prevStatus);
        updateState(machines);
        detectEvents(prevStatuses, machines);
        analyzeAllMachines(machines);
        machines.forEach(m => { m._prevStatus = m.currentStatus; });
        renderKPIs(FactoryState);
        renderEventFeed();
        renderFactoryFloor(FactoryState.machines);
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

function safeInit(name, fn) {
    try { fn(); } catch (err) { console.error('Init step failed: ' + name, err); }
}

function initApp() {
    console.log('Initializing app...');
    MACHINES.forEach(initMachineData);
    randomizeSomeMachinesRunning(MACHINES);
    safeInit("initState(MACHINES);", () => initState(MACHINES););

    logEvent('Factory simulation initialized with ' + MACHINES.length + ' machines');
    renderKPIs(FactoryState);
    renderEventFeed();

    safeInit("initFactoryFloorControls(MACHINES);", () => initFactoryFloorControls(MACHINES););
    safeInit("initMachineDetailControls();", () => initMachineDetailControls(););
    safeInit("initAlertEngine();", () => initAlertEngine(););
    safeInit("initIncidentEngine();", () => initIncidentEngine(););
    safeInit("initAutomationEngine();", () => initAutomationEngine(););
    safeInit("initOrderForm();", () => initOrderForm(););
    renderOrdersPanel();
    renderIncidentsPanel();
    renderAlertsPanel();
    renderFactoryFloor(MACHINES);

    simulationInterval = startSimulation(MACHINES, onSimulationTick);
    console.log('Simulation started. Interval ID:', simulationInterval);
}

document.addEventListener('DOMContentLoaded', initApp);


