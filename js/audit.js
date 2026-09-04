// audit.js
// Phase 7: Audit Logging - every user command is stored here

const AuditLog = [];

function recordAudit(entry) {
    AuditLog.unshift({
        timestamp: new Date(),
        user: entry.user || 'OPERATOR',
        machineId: entry.machineId,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        result: entry.result || 'SUCCESS'
    });
    if (AuditLog.length > 500) AuditLog.pop();
    renderAuditLog();
}

function renderAuditLog() {
    const el = document.getElementById('audit-log');
    if (!el) return;
    el.innerHTML = AuditLog.slice(0, 20).map(a => {
        const t = a.timestamp.toLocaleTimeString('en-GB');
        return '<div class="audit-item">' + t + '  [' + a.user + ']  ' + a.machineId + '  ' + a.action +
            ' (' + a.fromStatus + ' -> ' + a.toStatus + ')  ' + a.result + '</div>';
    }).join('');
}

if (typeof module !== "undefined") {
    module.exports = { AuditLog, recordAudit, renderAuditLog };
}
