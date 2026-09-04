// automation.js
// Phase 11: Automated Factory Action Engine
// Rules are configurable, logged, visible on dashboard, and reversible where appropriate

const AutomationRules = {
    autoStopOnCriticalTemp: true,
    autoReassignOnFailure: true,
    emergencyIsolation: true,
    cooldownMs: 20000,
    lastActionKey: {}
};

const AutomationLog = [];

function logAutomation(machineId, ruleName, actionDescription) {
    const entry = {
        id: 'AUTO-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        timestamp: new Date(),
        machineId: machineId,
        rule: ruleName,
        action: actionDescription
    };
    AutomationLog.unshift(entry);
    if (AutomationLog.length > 200) AutomationLog.pop();
    logEvent('AUTOMATION: ' + actionDescription);
    renderAutomationPanel();
    return entry;
}

function canFire(key) {
    const now = Date.now();
    const last = AutomationRules.lastActionKey[key];
    if (last && (now - last) < AutomationRules.cooldownMs) return false;
    AutomationRules.lastActionKey[key] = now;
    return true;
}

// EXAMPLE 1: Temperature Critical -> Stop Machine -> Create Incident -> Create Maintenance Job -> Notify Supervisor
function handleCriticalTemperature(evt) {
    if (!AutomationRules.autoStopOnCriticalTemp) return;
    const key = evt.machineId + ':autoStopTemp';
    if (!canFire(key)) return;

    const machine = getMachine(evt.machineId);
    if (!machine || machine.currentStatus === 'FAULT' || machine.currentStatus === 'STOPPED') return;

    const fromStatus = machine.currentStatus;
    machine.currentStatus = 'FAULT';
    recordAudit({ user: 'AUTOMATION', machineId: evt.machineId, action: 'AUTO_STOP', fromStatus, toStatus: 'FAULT', result: 'SUCCESS' });
    logAutomation(evt.machineId, 'autoStopOnCriticalTemp', evt.machineId + ' auto-stopped (critical temperature) -> incident + maintenance job created -> supervisor notified');

    createIncidentFromAlert({ id: evt.id, machineId: evt.machineId, severity: 'CRITICAL', message: 'Auto-stop: ' + evt.message });
    createMaintenanceJob(evt.machineId, 'Auto-generated: critical temperature shutdown');

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);
    if (currentDetailMachineId === evt.machineId) renderMachineDetail(evt.machineId);
}

// EXAMPLE 2: Machine Failure -> Find Available Machine -> Reassign Production -> Update Order -> Continue Production
function handleMachineFailureReassignment(evt) {
    if (!AutomationRules.autoReassignOnFailure) return;
    const key = evt.machineId + ':reassign';
    if (!canFire(key)) return;

    const failedMachine = getMachine(evt.machineId);
    if (!failedMachine) return;

    const candidate = FactoryState.machines.find(m =>
        m.machineId !== failedMachine.machineId &&
        m.machineType === failedMachine.machineType &&
        (m.currentStatus === 'IDLE' || m.currentStatus === 'STOPPED')
    );

    if (candidate) {
        const fromStatus = candidate.currentStatus;
        candidate.currentStatus = 'RUNNING';
        recordAudit({ user: 'AUTOMATION', machineId: candidate.machineId, action: 'AUTO_START (reassignment)', fromStatus, toStatus: 'RUNNING', result: 'SUCCESS' });
        logAutomation(evt.machineId, 'autoReassignOnFailure',
            'Production reassigned from ' + evt.machineId + ' to ' + candidate.machineId + ' (same type: ' + candidate.machineType + ')');
    } else {
        logAutomation(evt.machineId, 'autoReassignOnFailure', 'No available replacement machine found for ' + evt.machineId + ' (type: ' + failedMachine.machineType + ')');
    }

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);
}

// EXAMPLE 3: Emergency Condition -> Stop Affected + Related Machines -> Isolate Line -> Critical Incident -> Escalate
function handleEmergencyIsolation(machineId) {
    if (!AutomationRules.emergencyIsolation) return;
    const machine = getMachine(machineId);
    if (!machine) return;
    const key = machineId + ':isolation';
    if (!canFire(key)) return;

    const lineMachines = FactoryState.machines.filter(m => m.lineId === machine.lineId && m.machineId !== machineId);
    lineMachines.forEach(m => {
        if (m.currentStatus === 'RUNNING' || m.currentStatus === 'IDLE') {
            const fromStatus = m.currentStatus;
            m.currentStatus = 'STOPPED';
            recordAudit({ user: 'AUTOMATION', machineId: m.machineId, action: 'AUTO_STOP (isolation)', fromStatus, toStatus: 'STOPPED', result: 'SUCCESS' });
        }
    });

    logAutomation(machineId, 'emergencyIsolation',
        'Emergency: Line ' + machine.lineId + ' isolated (' + lineMachines.length + ' related machines stopped) due to ' + machineId);

    const incident = createIncidentFromAlert({ id: 'ESC-' + Date.now(), machineId: machineId, severity: 'CRITICAL', message: 'EMERGENCY: Line ' + machine.lineId + ' isolated' });
    logAutomation(machineId, 'escalation', 'Incident ' + incident.incidentId + ' escalated to EMERGENCY priority');

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);
}

function renderAutomationPanel() {
    const el = document.getElementById('automation-log');
    if (!el) return;
    el.innerHTML = AutomationLog.slice(0, 20).map(a => {
        const t = a.timestamp.toLocaleTimeString('en-GB');
        return '<div class="automation-item"><span class="auto-time">' + t + '</span><span class="auto-rule">' + a.rule + '</span><span class="auto-desc">' + a.action + '</span></div>';
    }).join('') || '<p class="no-results">No automated actions yet.</p>';
}

function initAutomationEngine() {
    onEvent(evt => {
        if (evt.type === 'TEMP_CRITICAL') {
            handleCriticalTemperature(evt);
        }
        if (evt.type === 'MACHINE_FAULT') {
            handleMachineFailureReassignment(evt);
            const machine = getMachine(evt.machineId);
            if (machine && machine.sensors && machine.sensors.temperature > machine.operatingLimits.tempMax * 1.05) {
                handleEmergencyIsolation(evt.machineId);
            }
        }
    });
    renderAutomationPanel();
}

if (typeof module !== "undefined") {
    module.exports = { AutomationRules, AutomationLog, handleCriticalTemperature, handleMachineFailureReassignment, handleEmergencyIsolation, initAutomationEngine };
}
