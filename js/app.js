// app.js
// Main application entry point - wires simulator -> state -> dashboard (Phase 5)

let simulationInterval = null;
const eventFeed = [];
const MAX_FEED_ITEMS = 15;

function logEvent(text) {
    const time = new Date().toLocaleTimeString('en-GB');
    eventFeed.unshift(time + '  ' + text);
    if (eventFeed.length > MAX_FEED_ITEMS) eventFeed.pop();
}

function renderKPIs(state) {
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
    document.getElementById('last-update').textContent = 'Last Update: ' + state.lastUpdate.toLocaleTimeString('en-GB');
}

function renderEventFeed() {
    const feedEl = document.getElementById('event-feed');
    feedEl.innerHTML = eventFeed.map(e => '<div class="feed-item">' + e + '</div>').join('');
}

function detectEvents(prevMachines, newMachines) {
    newMachines.forEach((m, i) => {
        const prev = prevMachines[i];
        if (!prev) return;
        if (prev.currentStatus !== m.currentStatus) {
            logEvent(m.machineId + ' status changed: ' + prev.currentStatus + ' -> ' + m.currentStatus);
        }
        if (m.currentStatus === 'FAULT' && prev.currentStatus !== 'FAULT') {
            logEvent(m.machineId + ' CRITICAL: fault detected');
        }
    });
}

function onSimulationTick(machines) {
    const prevSnapshot = FactoryState.machines.map(m => ({ machineId: m.machineId, currentStatus: m.currentStatus }));
    updateState(machines);
    detectEvents(prevSnapshot, machines);
    renderKPIs(FactoryState);
    renderEventFeed();
}

function randomizeSomeMachinesRunning(machines) {
    machines.forEach(m => {
        const r = Math.random();
        if (r < 0.8) m.currentStatus = 'RUNNING';
        else if (r < 0.9) m.currentStatus = 'IDLE';
        else m.currentStatus = 'STOPPED';
    });
}

function initApp() {
    initMachineData; // ensure loaded
    MACHINES.forEach(initMachineData);
    randomizeSomeMachinesRunning(MACHINES);
    initState(MACHINES);

    logEvent('Factory simulation initialized with ' + MACHINES.length + ' machines');
    renderKPIs(FactoryState);
    renderEventFeed();

    simulationInterval = startSimulation(MACHINES, onSimulationTick);
}

document.addEventListener('DOMContentLoaded', initApp);
