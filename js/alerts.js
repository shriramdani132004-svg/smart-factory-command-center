// alerts.js
// Phase 9: Alert Engine - turns critical/warning events into active, trackable alerts

const AlertRules = {
    // Only these event types generate alerts (not every INFO event)
    triggerTypes: ['TEMP_WARNING', 'TEMP_CRITICAL', 'VIBRATION_WARNING', 'VIBRATION_CRITICAL', 'MACHINE_FAULT'],
    // Cooldown to avoid duplicate-spam alerts for the same machine+type within N ms
    cooldownMs: 15000,
    lastAlertKey: {}
};

function shouldCreateAlert(evt) {
    if (!AlertRules.triggerTypes.includes(evt.type)) return false;
    const key = evt.machineId + ':' + evt.type;
    const last = AlertRules.lastAlertKey[key];
    const now = Date.now();
    if (last && (now - last) < AlertRules.cooldownMs) return false;
    AlertRules.lastAlertKey[key] = now;
    return true;
}

function createAlertFromEvent(evt) {
    const alert = {
        id: 'ALERT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        machineId: evt.machineId,
        type: evt.type,
        severity: evt.severity,
        message: evt.message,
        createdAt: new Date(),
        resolved: false,
        acknowledgedBy: null
    };
    FactoryState.alerts.unshift(alert);
    if (FactoryState.alerts.length > 200) FactoryState.alerts.pop();
    recalculateKPIs();
    return alert;
}

function acknowledgeAlert(alertId, user) {
    const alert = FactoryState.alerts.find(a => a.id === alertId);
    if (alert) alert.acknowledgedBy = user || 'OPERATOR';
    renderAlertsPanel();
}

function resolveAlert(alertId) {
    const alert = FactoryState.alerts.find(a => a.id === alertId);
    if (alert) alert.resolved = true;
    recalculateKPIs();
    renderKPIs(FactoryState);
    renderAlertsPanel();
}

function renderAlertsPanel() {
    const el = document.getElementById('alerts-list');
    if (!el) return;
    const active = FactoryState.alerts.filter(a => !a.resolved).slice(0, 30);

    if (active.length === 0) {
        el.innerHTML = '<p class="no-results">No active alerts.</p>';
        return;
    }

    el.innerHTML = active.map(a => {
        const t = a.createdAt.toLocaleTimeString('en-GB');
        const sevClass = 'sev-' + a.severity.toLowerCase();
        return '<div class="alert-item ' + sevClass + '">' +
            '<div class="alert-main">' +
            '<span class="alert-sev">' + a.severity + '</span>' +
            '<span class="alert-msg">' + a.message + '</span>' +
            '<span class="alert-time">' + t + '</span>' +
            '</div>' +
            '<div class="alert-actions">' +
            (a.acknowledgedBy ? '<span class="ack-tag">ACK: ' + a.acknowledgedBy + '</span>' : '<button class="alert-btn ack-btn" data-id="' + a.id + '">ACK</button>') +
            '<button class="alert-btn resolve-btn" data-id="' + a.id + '">RESOLVE</button>' +
            '</div></div>';
    }).join('');

    el.querySelectorAll('.ack-btn').forEach(btn => {
        btn.addEventListener('click', () => acknowledgeAlert(btn.getAttribute('data-id'), 'OPERATOR'));
    });
    el.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', () => resolveAlert(btn.getAttribute('data-id')));
    });
}

// Wire the alert engine to listen to every emitted event
function initAlertEngine() {
    onEvent(evt => {
        if (shouldCreateAlert(evt)) {
            createAlertFromEvent(evt);
            renderAlertsPanel();
            renderKPIs(FactoryState);
        }
    });
}

if (typeof module !== "undefined") {
    module.exports = { AlertRules, shouldCreateAlert, createAlertFromEvent, acknowledgeAlert, resolveAlert, renderAlertsPanel, initAlertEngine };
}
