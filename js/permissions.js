// permissions.js - Phase 18: User Roles & Access Control

const ROLES = {
    ADMIN:      { label: 'Administrator', level: 4 },
    SUPERVISOR: { label: 'Supervisor',    level: 3 },
    OPERATOR:   { label: 'Operator',      level: 2 },
    VIEWER:     { label: 'Viewer',        level: 1 }
};

// Which actions each role is permitted to perform
const PERMISSIONS = {
    ADMIN:      ['MACHINE_CONTROL', 'CREATE_ORDER', 'CANCEL_ORDER', 'MAINTENANCE_ACTIONS', 'ALERT_ACTIONS', 'INCIDENT_ACTIONS', 'CHANGE_SETTINGS', 'CLEAR_DATA', 'AUTOMATION_TOGGLE'],
    SUPERVISOR: ['MACHINE_CONTROL', 'CREATE_ORDER', 'CANCEL_ORDER', 'MAINTENANCE_ACTIONS', 'ALERT_ACTIONS', 'INCIDENT_ACTIONS', 'CHANGE_SETTINGS'],
    OPERATOR:   ['MACHINE_CONTROL', 'CREATE_ORDER', 'MAINTENANCE_ACTIONS', 'ALERT_ACTIONS'],
    VIEWER:     []
};

let currentUser = { name: 'Guest', role: null };

function hasPermission(action) {
    if (!currentUser.role) return false;
    return (PERMISSIONS[currentUser.role] || []).includes(action);
}

function login(name, role) {
    currentUser = { name: name || 'Operator', role: role };
    try { localStorage.setItem('factoryUser', JSON.stringify(currentUser)); } catch (e) {}
    recordAuditIfAvailable('LOGIN', name, role);
    applyRoleToUI();
}

function logout() {
    recordAuditIfAvailable('LOGOUT', currentUser.name, currentUser.role);
    currentUser = { name: 'Guest', role: null };
    try { localStorage.removeItem('factoryUser'); } catch (e) {}
    showLoginScreen();
}

function recordAuditIfAvailable(action, name, role) {
    if (typeof recordAudit === 'function') {
        recordAudit({ user: name + ' (' + role + ')', machineId: 'SYSTEM', action: action, fromStatus: '-', toStatus: '-', result: 'SUCCESS' });
    }
}

function restoreSession() {
    try {
        const raw = localStorage.getItem('factoryUser');
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved && saved.role && ROLES[saved.role]) {
                currentUser = saved;
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// Hide/disable elements the current role isn't permitted to use
function applyRoleToUI() {
    const roleLabel = document.getElementById('current-role-label');
    if (roleLabel) roleLabel.textContent = currentUser.name + ' (' + (ROLES[currentUser.role] ? ROLES[currentUser.role].label : 'Guest') + ')';

    const gateMap = {
        'MACHINE_CONTROL': ['#btn-start', '#btn-stop', '#btn-pause', '#btn-resume', '#btn-reset', '#btn-estop'],
        'CREATE_ORDER': ['#order-create-btn', '#order-product', '#order-qty', '#order-priority'],
        'CHANGE_SETTINGS': ['#setting-sim-speed', '#setting-auto-stop', '#setting-auto-reassign', '#setting-emergency-isolation'],
        'CLEAR_DATA': ['#clear-storage-btn']
    };

    Object.keys(gateMap).forEach(action => {
        const allowed = hasPermission(action);
        gateMap[action].forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                el.disabled = !allowed;
                el.style.opacity = allowed ? '1' : '0.4';
                el.style.cursor = allowed ? 'pointer' : 'not-allowed';
            }
        });
    });

    // Dynamically-created buttons (order/alert/incident/maintenance action buttons) get gated
    // by a global click-guard rather than per-element, since they're re-rendered every tick.
    document.body.setAttribute('data-role', currentUser.role || 'NONE');

    hideLoginScreen();
}

// Global guard: intercepts clicks on gated dynamic buttons (rendered fresh each tick by other panels)
function initPermissionGuard() {
    document.body.addEventListener('click', function (e) {
        const target = e.target;
        if (!target || !target.classList) return;

        const dynamicGates = {
            'assign-btn': 'CREATE_ORDER', 'cancel-btn': 'CANCEL_ORDER',
            'ack-btn': 'ALERT_ACTIONS', 'resolve-btn': 'ALERT_ACTIONS',
            'incident-btn': 'INCIDENT_ACTIONS', 'maint-btn': 'MAINTENANCE_ACTIONS'
        };

        for (const cls in dynamicGates) {
            if (target.classList.contains(cls)) {
                if (!hasPermission(dynamicGates[cls])) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    alert('Your role (' + (ROLES[currentUser.role] ? ROLES[currentUser.role].label : 'Guest') + ') does not have permission to perform this action.');
                }
                return;
            }
        }
    }, true); // capture phase - runs before the panel's own listener
}

function showLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
}
function hideLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
}

function initLoginScreen() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const name = document.getElementById('login-name').value.trim() || 'Operator';
        const role = document.getElementById('login-role').value;
        login(name, role);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    if (restoreSession()) {
        applyRoleToUI();
    } else {
        showLoginScreen();
    }
}

if (typeof module !== "undefined") {
    module.exports = { ROLES, PERMISSIONS, hasPermission, login, logout, applyRoleToUI, initPermissionGuard, initLoginScreen };
}
