// state.js
// Central Real-Time State Engine (Phase 4)
// Machine Simulator -> New Machine State -> State Engine -> Update Global Factory State
// -> Update Dashboard -> Trigger Rules/Alerts/Automation

const FactoryState = {
    machines: [],           // live machine array (from machine.js)
    alerts: [],
    incidents: [],
    orders: [],
    maintenanceJobs: [],
    kpis: {
        totalMachines: 0,
        running: 0,
        idle: 0,
        paused: 0,
        stopped: 0,
        fault: 0,
        offline: 0,
        maintenance: 0,
        productionToday: 0,
        productionRate: 0,
        energyConsumption: 0,
        efficiency: 0,
        activeAlerts: 0,
        activeOrders: 0
    },
    lastUpdate: null,
    listeners: []           // dashboard components subscribe here
};

// Initialize state with the machine list
function initState(machines) {
    FactoryState.machines = machines;
    recalculateKPIs();
    return FactoryState;
}

// Subscribe a callback to state changes (used by dashboard/UI components)
function subscribe(callback) {
    FactoryState.listeners.push(callback);
}

// Notify all subscribed listeners (updates dashboard without refresh)
function notifyListeners() {
    FactoryState.listeners.forEach(fn => fn(FactoryState));
}

// Recalculate all factory-wide KPIs from current machine states
function recalculateKPIs() {
    const k = FactoryState.kpis;
    const machines = FactoryState.machines;

    k.totalMachines = machines.length;
    k.running = machines.filter(m => m.currentStatus === "RUNNING").length;
    k.idle = machines.filter(m => m.currentStatus === "IDLE").length;
    k.paused = machines.filter(m => m.currentStatus === "PAUSED").length;
    k.stopped = machines.filter(m => m.currentStatus === "STOPPED").length;
    k.fault = machines.filter(m => m.currentStatus === "FAULT").length;
    k.offline = machines.filter(m => m.currentStatus === "OFFLINE").length;
    k.maintenance = machines.filter(m => m.currentStatus === "MAINTENANCE").length;

    k.productionToday = machines.reduce((sum, m) => sum + (m.metrics ? m.metrics.productionCount : 0), 0);
    k.energyConsumption = Math.round(machines.reduce((sum, m) => sum + (m.sensors ? m.sensors.powerConsumption : 0), 0) * 100) / 100;

    const effValues = machines.filter(m => m.metrics).map(m => m.metrics.efficiency);
    k.efficiency = effValues.length ? Math.round((effValues.reduce((a, b) => a + b, 0) / effValues.length) * 10) / 10 : 0;

    k.activeAlerts = FactoryState.alerts.filter(a => !a.resolved).length;
    k.activeOrders = FactoryState.orders.filter(o => o.status !== "COMPLETED").length;
    k.productionRate = k.running > 0 ? Math.round((k.productionToday / k.running) * 10) / 10 : 0;
}

// Main state update cycle - called every second after a simulation tick
function updateState(updatedMachines) {
    FactoryState.machines = updatedMachines;
    recalculateKPIs();
    FactoryState.lastUpdate = new Date();

    notifyListeners();       // update dashboard
    return FactoryState;
}

// Helper: get a single machine by ID
function getMachine(machineId) {
    return FactoryState.machines.find(m => m.machineId === machineId);
}

if (typeof module !== "undefined") {
    module.exports = {
        FactoryState, initState, subscribe, notifyListeners,
        recalculateKPIs, updateState, getMachine
    };
}
