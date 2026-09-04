// events.js
// Phase 8: Event Engine - classifies every state change / sensor reading into structured events

const EVENT_TYPES = {
    STATUS_CHANGE: 'STATUS_CHANGE',
    TEMP_WARNING: 'TEMP_WARNING',
    TEMP_CRITICAL: 'TEMP_CRITICAL',
    VIBRATION_WARNING: 'VIBRATION_WARNING',
    VIBRATION_CRITICAL: 'VIBRATION_CRITICAL',
    PRODUCTION_MILESTONE: 'PRODUCTION_MILESTONE',
    MACHINE_FAULT: 'MACHINE_FAULT',
    MACHINE_RECOVERED: 'MACHINE_RECOVERED',
    COMMAND_EXECUTED: 'COMMAND_EXECUTED'
};

const EVENT_SEVERITY = {
    STATUS_CHANGE: 'INFO',
    TEMP_WARNING: 'WARNING',
    TEMP_CRITICAL: 'CRITICAL',
    VIBRATION_WARNING: 'WARNING',
    VIBRATION_CRITICAL: 'CRITICAL',
    PRODUCTION_MILESTONE: 'INFO',
    MACHINE_FAULT: 'CRITICAL',
    MACHINE_RECOVERED: 'INFO',
    COMMAND_EXECUTED: 'INFO'
};

const EventLog = [];
const eventSubscribers = [];

function onEvent(callback) {
    eventSubscribers.push(callback);
}

function emitEvent(type, machineId, message, data) {
    const evt = {
        id: 'EVT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        type: type,
        severity: EVENT_SEVERITY[type] || 'INFO',
        machineId: machineId,
        message: message,
        data: data || {},
        timestamp: new Date()
    };
    EventLog.unshift(evt);
    if (EventLog.length > 1000) EventLog.pop();

    eventSubscribers.forEach(fn => fn(evt));
    return evt;
}

// Analyze a machine each tick and emit relevant events
function analyzeMachineForEvents(machine, prevStatus) {
    const s = machine.sensors;
    if (!s) return;
    const limits = machine.operatingLimits;

    if (prevStatus && prevStatus !== machine.currentStatus) {
        emitEvent(EVENT_TYPES.STATUS_CHANGE, machine.machineId,
            machine.machineId + ' changed ' + prevStatus + ' -> ' + machine.currentStatus,
            { from: prevStatus, to: machine.currentStatus });

        if (machine.currentStatus === 'FAULT') {
            emitEvent(EVENT_TYPES.MACHINE_FAULT, machine.machineId, machine.machineId + ' entered FAULT state', {});
        }
        if (prevStatus === 'FAULT' && machine.currentStatus !== 'FAULT') {
            emitEvent(EVENT_TYPES.MACHINE_RECOVERED, machine.machineId, machine.machineId + ' recovered from FAULT', {});
        }
    }

    if (s.temperature >= limits.tempMax) {
        emitEvent(EVENT_TYPES.TEMP_CRITICAL, machine.machineId,
            machine.machineId + ' temperature critical: ' + s.temperature + 'C', { value: s.temperature });
    } else if (s.temperature >= limits.tempMax * 0.9) {
        emitEvent(EVENT_TYPES.TEMP_WARNING, machine.machineId,
            machine.machineId + ' temperature elevated: ' + s.temperature + 'C', { value: s.temperature });
    }

    if (s.vibration >= limits.vibrationMax) {
        emitEvent(EVENT_TYPES.VIBRATION_CRITICAL, machine.machineId,
            machine.machineId + ' vibration critical: ' + s.vibration, { value: s.vibration });
    } else if (s.vibration >= limits.vibrationMax * 0.85) {
        emitEvent(EVENT_TYPES.VIBRATION_WARNING, machine.machineId,
            machine.machineId + ' vibration elevated: ' + s.vibration, { value: s.vibration });
    }

    if (machine.metrics && machine.metrics.productionCount > 0 && machine.metrics.productionCount % 500 === 0 && !machine._milestoneLogged) {
        emitEvent(EVENT_TYPES.PRODUCTION_MILESTONE, machine.machineId,
            machine.machineId + ' reached ' + machine.metrics.productionCount + ' units produced', {});
        machine._milestoneLogged = true;
    } else if (machine.metrics && machine.metrics.productionCount % 500 !== 0) {
        machine._milestoneLogged = false;
    }
}

function analyzeAllMachines(machines) {
    machines.forEach(m => {
        analyzeMachineForEvents(m, m._prevStatus);
    });
}

if (typeof module !== "undefined") {
    module.exports = { EVENT_TYPES, EVENT_SEVERITY, EventLog, onEvent, emitEvent, analyzeMachineForEvents, analyzeAllMachines };
}
