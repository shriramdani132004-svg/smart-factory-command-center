// controller.js
// Phase 7: Machine Control - START, STOP, PAUSE, RESUME, RESET, EMERGENCY_STOP
// Workflow: User clicks -> Command Validation -> State Transition -> Dashboard Update -> Event Logged

const VALID_TRANSITIONS = {
    START:          { from: ['IDLE', 'STOPPED'],                     via: 'STARTING', to: 'RUNNING' },
    STOP:           { from: ['RUNNING', 'PAUSED', 'IDLE'],            via: 'STOPPING', to: 'STOPPED' },
    PAUSE:          { from: ['RUNNING'],                              via: null,       to: 'PAUSED' },
    RESUME:         { from: ['PAUSED'],                               via: 'STARTING', to: 'RUNNING' },
    RESET:          { from: ['FAULT', 'STOPPED', 'EMERGENCY_STOP'],   via: null,       to: 'IDLE' },
    EMERGENCY_STOP: { from: ['RUNNING', 'PAUSED', 'IDLE', 'STARTING'],via: null,       to: 'EMERGENCY_STOP' }
};

function sendCommand(machineId, action, user) {
    const machine = getMachine(machineId);
    if (!machine) return { ok: false, message: 'Machine not found' };

    const rule = VALID_TRANSITIONS[action];
    if (!rule) return { ok: false, message: 'Unknown command' };

    const fromStatus = machine.currentStatus;

    // Command validation
    if (!rule.from.includes(fromStatus)) {
        recordAudit({ user, machineId, action, fromStatus, toStatus: fromStatus, result: 'REJECTED (invalid transition)' });
        return { ok: false, message: 'Cannot ' + action + ' machine in state ' + fromStatus };
    }

    // Apply transition (with transient state if defined)
    if (rule.via) {
        machine.currentStatus = rule.via;
        renderFactoryFloor(FactoryState.machines);
        setTimeout(() => {
            machine.currentStatus = rule.to;
            if (action === 'RESET') {
                machine.metrics.errorCount = 0;
                if (machine.sensors) {
                    const base = getBaseline(machine.machineType);
                    machine.sensors.temperature = base.temp;
                    machine.sensors.vibration = base.vibration;
                }
            }
            renderKPIs(FactoryState);
            renderFactoryFloor(FactoryState.machines);
            if (currentDetailMachineId === machineId) renderMachineDetail(machineId);
        }, 800);
    } else {
        machine.currentStatus = rule.to;
        if (action === 'RESET') {
            machine.metrics.errorCount = 0;
            if (machine.sensors) {
                const base = getBaseline(machine.machineType);
                machine.sensors.temperature = base.temp;
                machine.sensors.vibration = base.vibration;
            }
        }
    }

    recordAudit({ user, machineId, action, fromStatus, toStatus: machine.currentStatus, result: 'SUCCESS' });
    logEvent(machineId + ' command: ' + action + ' (' + fromStatus + ' -> ' + machine.currentStatus + ')');

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);

    return { ok: true, message: action + ' command accepted' };
}

if (typeof module !== "undefined") {
    module.exports = { sendCommand, VALID_TRANSITIONS };
}
