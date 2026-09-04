// storage.js - Phase 17: Browser Data Storage
// LocalStorage: settings, preferences, factory configuration
// IndexedDB: sensor/event history, alerts, incidents, maintenance history, analytics

const DB_NAME = 'SmartFactoryDB';
const DB_VERSION = 1;
const STORES = ['events', 'alerts', 'incidents', 'maintenanceHistory', 'analyticsSnapshots'];
let dbInstance = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) { resolve(dbInstance); return; }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('alerts')) db.createObjectStore('alerts', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('incidents')) db.createObjectStore('incidents', { keyPath: 'incidentId' });
            if (!db.objectStoreNames.contains('maintenanceHistory')) db.createObjectStore('maintenanceHistory', { keyPath: 'jobId' });
            if (!db.objectStoreNames.contains('analyticsSnapshots')) db.createObjectStore('analyticsSnapshots', { autoIncrement: true });
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        request.onerror = (event) => {
            console.error('IndexedDB open failed:', event.target.error);
            reject(event.target.error);
        };
    });
}

function idbPutAll(storeName, items) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    })).catch(err => console.error('idbPutAll(' + storeName + ') failed:', err));
}

function idbClearAndInsert(storeName, items) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        items.forEach(item => store.add ? store.put(item) : null);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    })).catch(err => console.error('idbClearAndInsert(' + storeName + ') failed:', err));
}

function idbGetAll(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
    })).catch(err => { console.error('idbGetAll(' + storeName + ') failed:', err); return []; });
}

function idbClearStore(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    }));
}

// --- Persistence (called periodically from app.js) ---
function persistAllData() {
    idbPutAll('events', EventLog.slice(0, 200));
    idbPutAll('alerts', FactoryState.alerts.slice(0, 200));
    idbPutAll('incidents', FactoryState.incidents.slice(0, 200));
    idbPutAll('maintenanceHistory', FactoryState.maintenanceJobs.filter(j => j.status === 'COMPLETED').slice(0, 200));
    idbClearAndInsert('analyticsSnapshots', AnalyticsHistory.slice(-500));
    updateStorageStatus();
}

// --- Restore on load ---
function loadPersistedData() {
    return Promise.all([
        idbGetAll('analyticsSnapshots'),
        idbGetAll('events'),
        idbGetAll('alerts'),
        idbGetAll('incidents'),
        idbGetAll('maintenanceHistory')
    ]).then(([snapshots, events, alerts, incidents, maintenance]) => {
        if (snapshots.length) {
            const restored = snapshots.map(s => Object.assign({}, s, { timestamp: new Date(s.timestamp) }));
            AnalyticsHistory.unshift(...restored);
            if (typeof renderAnalyticsCharts === 'function') renderAnalyticsCharts();
        }
        if (events.length) {
            const restored = events.map(e => Object.assign({}, e, { timestamp: new Date(e.timestamp) }));
            EventLog.push(...restored.filter(e => !EventLog.some(existing => existing.id === e.id)));
        }
        if (alerts.length && FactoryState.alerts.length === 0) {
            FactoryState.alerts = alerts.map(a => Object.assign({}, a, { createdAt: new Date(a.createdAt) }));
            if (typeof renderAlertsPanel === 'function') renderAlertsPanel();
        }
        if (incidents.length && FactoryState.incidents.length === 0) {
            FactoryState.incidents = incidents.map(i => Object.assign({}, i, { detectionTime: new Date(i.detectionTime), resolutionTime: i.resolutionTime ? new Date(i.resolutionTime) : null }));
            if (typeof renderIncidentsPanel === 'function') renderIncidentsPanel();
        }
        if (maintenance.length) {
            const restoredJobs = maintenance.map(j => Object.assign({}, j, { createdAt: new Date(j.createdAt), startedAt: j.startedAt ? new Date(j.startedAt) : null, completedAt: j.completedAt ? new Date(j.completedAt) : null }));
            FactoryState.maintenanceJobs.push(...restoredJobs.filter(j => !FactoryState.maintenanceJobs.some(existing => existing.jobId === j.jobId)));
            if (typeof renderMaintenancePanel === 'function') renderMaintenancePanel();
        }
        logEvent('Restored ' + snapshots.length + ' analytics points, ' + alerts.length + ' alerts, ' + incidents.length + ' incidents, ' + maintenance.length + ' maintenance records from browser storage');
        updateStorageStatus();
    }).catch(err => console.error('loadPersistedData failed:', err));
}

function clearAllStoredData() {
    if (!confirm('This will permanently delete all stored history (events, alerts, incidents, maintenance, analytics) and settings. Continue?')) return;
    Promise.all(STORES.map(s => idbClearStore(s))).then(() => {
        localStorage.removeItem('factorySettings');
        logEvent('All stored data cleared. Reloading...');
        setTimeout(() => location.reload(), 800);
    });
}

function updateStorageStatus() {
    const el = document.getElementById('storage-status');
    if (!el) return;
    idbGetAll('analyticsSnapshots').then(snaps => {
        el.textContent = 'IndexedDB: ' + snaps.length + ' analytics points stored | Last sync: ' + new Date().toLocaleTimeString('en-GB');
    });
}

// --- Settings (LocalStorage) ---
const DEFAULT_SETTINGS = {
    simSpeed: 1,
    autoStopOnCriticalTemp: true,
    autoReassignOnFailure: true,
    emergencyIsolation: true
};

function loadSettings() {
    try {
        const raw = localStorage.getItem('factorySettings');
        return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (err) {
        console.error('loadSettings failed:', err);
        return Object.assign({}, DEFAULT_SETTINGS);
    }
}

function saveSettings(settings) {
    try {
        localStorage.setItem('factorySettings', JSON.stringify(settings));
    } catch (err) {
        console.error('saveSettings failed:', err);
    }
}

function applySettings() {
    const settings = loadSettings();

    if (typeof setSimulationSpeed === 'function') setSimulationSpeed(settings.simSpeed);
    const speedSelect = document.getElementById('setting-sim-speed');
    if (speedSelect) speedSelect.value = String(settings.simSpeed);

    if (typeof AutomationRules !== 'undefined') {
        AutomationRules.autoStopOnCriticalTemp = settings.autoStopOnCriticalTemp;
        AutomationRules.autoReassignOnFailure = settings.autoReassignOnFailure;
        AutomationRules.emergencyIsolation = settings.emergencyIsolation;
    }
    const c1 = document.getElementById('setting-auto-stop');
    const c2 = document.getElementById('setting-auto-reassign');
    const c3 = document.getElementById('setting-emergency-isolation');
    if (c1) c1.checked = settings.autoStopOnCriticalTemp;
    if (c2) c2.checked = settings.autoReassignOnFailure;
    if (c3) c3.checked = settings.emergencyIsolation;
}

function initStorageControls() {
    const speedSelect = document.getElementById('setting-sim-speed');
    if (speedSelect) {
        speedSelect.addEventListener('change', () => {
            const settings = loadSettings();
            settings.simSpeed = parseInt(speedSelect.value);
            saveSettings(settings);
            if (typeof setSimulationSpeed === 'function') setSimulationSpeed(settings.simSpeed);
            if (simulationInterval) {
                stopSimulation(simulationInterval);
                simulationInterval = startSimulation(MACHINES, onSimulationTick);
            }
            logEvent('Simulation speed changed to ' + settings.simSpeed + 'x');
        });
    }

    ['setting-auto-stop', 'setting-auto-reassign', 'setting-emergency-isolation'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            const settings = loadSettings();
            settings.autoStopOnCriticalTemp = document.getElementById('setting-auto-stop').checked;
            settings.autoReassignOnFailure = document.getElementById('setting-auto-reassign').checked;
            settings.emergencyIsolation = document.getElementById('setting-emergency-isolation').checked;
            saveSettings(settings);
            AutomationRules.autoStopOnCriticalTemp = settings.autoStopOnCriticalTemp;
            AutomationRules.autoReassignOnFailure = settings.autoReassignOnFailure;
            AutomationRules.emergencyIsolation = settings.emergencyIsolation;
            logEvent('Automation settings updated');
        });
    });

    const clearBtn = document.getElementById('clear-storage-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllStoredData);

    applySettings();
    updateStorageStatus();
}

if (typeof module !== "undefined") {
    module.exports = { openDB, persistAllData, loadPersistedData, clearAllStoredData, loadSettings, saveSettings, applySettings, initStorageControls };
}
