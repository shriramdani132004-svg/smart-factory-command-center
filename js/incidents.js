// incidents.js
// Phase 10: Incident Management
// Workflow: ALERT -> INCIDENT CREATED -> ASSIGNED -> ACKNOWLEDGED -> IN PROGRESS -> RESOLVED -> CLOSED

const INCIDENT_STATUSES = ['CREATED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

let incidentCounter = 0;

function createIncidentFromAlert(alert) {
    incidentCounter++;
    const machine = getMachine(alert.machineId);
    const incident = {
        incidentId: 'INC-' + String(incidentCounter).padStart(4, '0'),
        machineId: alert.machineId,
        lineId: machine ? machine.lineId : 'UNKNOWN',
        severity: alert.severity,
        cause: alert.message,
        detectionTime: new Date(),
        assignedUser: null,
        status: 'CREATED',
        resolution: null,
        resolutionTime: null,
        sourceAlertId: alert.id
    };
    FactoryState.incidents.unshift(incident);
    if (FactoryState.incidents.length > 200) FactoryState.incidents.pop();

    emitEvent('SYSTEM_EVENT', alert.machineId, 'Incident ' + incident.incidentId + ' created from alert', { incidentId: incident.incidentId });
    logEvent(incident.incidentId + ' created for ' + alert.machineId + ' (' + alert.severity + ')');

    renderIncidentsPanel();
    return incident;
}

function assignIncident(incidentId, user) {
    const inc = FactoryState.incidents.find(i => i.incidentId === incidentId);
    if (!inc) return;
    inc.assignedUser = user;
    inc.status = 'ASSIGNED';
    renderIncidentsPanel();
}

function acknowledgeIncident(incidentId) {
    const inc = FactoryState.incidents.find(i => i.incidentId === incidentId);
    if (!inc || inc.status !== 'ASSIGNED') return;
    inc.status = 'ACKNOWLEDGED';
    renderIncidentsPanel();
}

function startIncidentProgress(incidentId) {
    const inc = FactoryState.incidents.find(i => i.incidentId === incidentId);
    if (!inc || inc.status !== 'ACKNOWLEDGED') return;
    inc.status = 'IN_PROGRESS';
    renderIncidentsPanel();
}

function resolveIncident(incidentId, resolutionText) {
    const inc = FactoryState.incidents.find(i => i.incidentId === incidentId);
    if (!inc || inc.status !== 'IN_PROGRESS') return;
    inc.status = 'RESOLVED';
    inc.resolution = resolutionText || 'Resolved by operator';
    inc.resolutionTime = new Date();
    logEvent(inc.incidentId + ' resolved: ' + inc.resolution);
    renderIncidentsPanel();
}

function closeIncident(incidentId) {
    const inc = FactoryState.incidents.find(i => i.incidentId === incidentId);
    if (!inc || inc.status !== 'RESOLVED') return;
    inc.status = 'CLOSED';
    renderIncidentsPanel();
}

const STATUS_ACTIONS = {
    CREATED:       { next: 'ASSIGNED',     label: 'ASSIGN TO ME',  fn: (id) => assignIncident(id, 'OPERATOR') },
    ASSIGNED:      { next: 'ACKNOWLEDGED', label: 'ACKNOWLEDGE',   fn: (id) => acknowledgeIncident(id) },
    ACKNOWLEDGED:  { next: 'IN_PROGRESS',  label: 'START WORK',    fn: (id) => startIncidentProgress(id) },
    IN_PROGRESS:   { next: 'RESOLVED',     label: 'RESOLVE',       fn: (id) => resolveIncident(id, 'Issue addressed by operator') },
    RESOLVED:      { next: 'CLOSED',       label: 'CLOSE',         fn: (id) => closeIncident(id) },
    CLOSED:        null
};

function renderIncidentsPanel() {
    const el = document.getElementById('incidents-list');
    if (!el) return;
    const open = FactoryState.incidents.filter(i => i.status !== 'CLOSED').slice(0, 30);

    if (open.length === 0) {
        el.innerHTML = '<p class="no-results">No open incidents.</p>';
        return;
    }

    el.innerHTML = open.map(inc => {
        const action = STATUS_ACTIONS[inc.status];
        const t = inc.detectionTime.toLocaleTimeString('en-GB');
        return '<div class="incident-item sev-' + inc.severity.toLowerCase() + '">' +
            '<div class="incident-main">' +
            '<span class="incident-id">' + inc.incidentId + '</span>' +
            '<span class="incident-status">' + inc.status.replace('_', ' ') + '</span>' +
            '<span class="incident-cause">' + inc.cause + '</span>' +
            '<span class="incident-time">' + t + '</span>' +
            (inc.assignedUser ? '<span class="incident-user">' + inc.assignedUser + '</span>' : '') +
            '</div>' +
            (action ? '<button class="incident-btn" data-id="' + inc.incidentId + '">' + action.label + '</button>' : '') +
            '</div>';
    }).join('');

    el.querySelectorAll('.incident-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const inc = FactoryState.incidents.find(i => i.incidentId === id);
            if (inc && STATUS_ACTIONS[inc.status]) {
                STATUS_ACTIONS[inc.status].fn(id);
            }
        });
    });
}

// Auto-create incidents for CRITICAL alerts only
function initIncidentEngine() {
    onEvent(evt => {
        if (evt.severity === 'CRITICAL' && ['TEMP_CRITICAL', 'VIBRATION_CRITICAL', 'MACHINE_FAULT'].includes(evt.type)) {
            const alreadyOpen = FactoryState.incidents.some(i => i.machineId === evt.machineId && i.status !== 'CLOSED' && i.cause === evt.message);
            if (!alreadyOpen) {
                createIncidentFromAlert({ id: evt.id, machineId: evt.machineId, severity: evt.severity, message: evt.message });
            }
        }
    });
}

if (typeof module !== "undefined") {
    module.exports = { createIncidentFromAlert, assignIncident, acknowledgeIncident, startIncidentProgress, resolveIncident, closeIncident, renderIncidentsPanel, initIncidentEngine };
}
