// maintenance.js - Phase 15: Maintenance Management
// Workflow: FAULT -> CREATED -> ASSIGNED -> IN_PROGRESS -> (PAUSED) -> REPAIRED -> TESTING -> COMPLETED (RUNNING)

let maintenanceCounter = 0;

const TECHNICIANS = ['R. Mehta', 'S. Kulkarni', 'A. Iyer', 'P. Deshmukh', 'N. Rao'];
const SPARE_PARTS = [
    { name: 'Bearing Set', stock: 25 },
    { name: 'Drive Belt', stock: 18 },
    { name: 'Hydraulic Seal', stock: 12 },
    { name: 'Sensor Module', stock: 30 },
    { name: 'Cooling Fan', stock: 15 },
    { name: 'Control Relay', stock: 20 }
];
const REPAIR_NOTES = [
    'Replaced worn component, tested under load.',
    'Cleaned sensor contacts and recalibrated.',
    'Tightened loose mounting bolts, checked alignment.',
    'Replaced faulty part, verified normal readings.',
    'Lubricated moving parts, reset error counters.'
];

function createMaintenanceJob(machineId, reason, priority) {
    maintenanceCounter++;
    const job = {
        jobId: 'MJ-' + String(maintenanceCounter).padStart(4, '0'),
        machineId: machineId,
        reason: reason,
        priority: priority || 'NORMAL',
        technician: null,
        status: 'CREATED',
        repairNotes: [],
        sparePartsUsed: [],
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        downtimeMinutes: 0
    };
    FactoryState.maintenanceJobs.unshift(job);
    if (FactoryState.maintenanceJobs.length > 300) FactoryState.maintenanceJobs.pop();

    const machine = getMachine(machineId);
    if (machine) machine.maintenanceStatus = 'PENDING';

    logEvent('Maintenance job ' + job.jobId + ' created for ' + machineId + ' (' + reason + ')');
    renderMaintenancePanel();
    return job;
}

function assignTechnician(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'CREATED') return;
    job.technician = TECHNICIANS[Math.floor(Math.random() * TECHNICIANS.length)];
    job.status = 'ASSIGNED';
    const machine = getMachine(job.machineId);
    if (machine) machine.maintenanceStatus = 'ASSIGNED';
    logEvent(job.jobId + ' assigned to ' + job.technician);
    renderMaintenancePanel();
}

function startMaintenance(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'ASSIGNED') return;
    job.status = 'IN_PROGRESS';
    job.startedAt = new Date();
    const machine = getMachine(job.machineId);
    if (machine) {
        machine.currentStatus = 'MAINTENANCE';
        machine.maintenanceStatus = 'IN_PROGRESS';
    }
    logEvent(job.jobId + ' maintenance started on ' + job.machineId);
    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);
    renderMaintenancePanel();
}

function pauseMaintenance(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'IN_PROGRESS') return;
    job.status = 'PAUSED';
    logEvent(job.jobId + ' paused');
    renderMaintenancePanel();
}

function resumeMaintenance(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'PAUSED') return;
    job.status = 'IN_PROGRESS';
    logEvent(job.jobId + ' resumed');
    renderMaintenancePanel();
}

function completeRepair(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'IN_PROGRESS') return;

    const part = SPARE_PARTS[Math.floor(Math.random() * SPARE_PARTS.length)];
    if (part.stock > 0) {
        part.stock -= 1;
        job.sparePartsUsed.push(part.name);
    }
    const note = REPAIR_NOTES[Math.floor(Math.random() * REPAIR_NOTES.length)];
    job.repairNotes.push(note);

    job.status = 'REPAIRED';
    const machine = getMachine(job.machineId);
    if (machine) machine.maintenanceStatus = 'REPAIRED';

    logEvent(job.jobId + ' repaired: ' + note + (part.stock >= 0 ? ' (used: ' + part.name + ')' : ''));
    renderMaintenancePanel();
}

function startTesting(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'REPAIRED') return;
    job.status = 'TESTING';
    const machine = getMachine(job.machineId);
    if (machine) machine.maintenanceStatus = 'TESTING';
    logEvent(job.jobId + ' now in TESTING phase');
    renderMaintenancePanel();
}

function returnToService(jobId) {
    const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
    if (!job || job.status !== 'TESTING') return;
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    job.downtimeMinutes = Math.round((job.completedAt - job.createdAt) / 60000 * 10) / 10;

    const machine = getMachine(job.machineId);
    if (machine) {
        machine.currentStatus = 'RUNNING';
        machine.maintenanceStatus = 'OK';
        if (machine.metrics) machine.metrics.errorCount = 0;
        if (machine.sensors) {
            const base = getBaseline(machine.machineType);
            machine.sensors.temperature = base.temp;
            machine.sensors.vibration = base.vibration;
        }
    }

    logEvent(job.jobId + ' COMPLETE - ' + job.machineId + ' returned to service (downtime: ' + job.downtimeMinutes + ' min)');
    recalculateKPIs();
    renderKPIs(FactoryState);
    renderFactoryFloor(FactoryState.machines);
    renderMaintenancePanel();
}

const MAINT_ACTIONS = {
    CREATED:     [{ label: 'ASSIGN TECHNICIAN', fn: assignTechnician }],
    ASSIGNED:    [{ label: 'START MAINTENANCE', fn: startMaintenance }],
    IN_PROGRESS: [{ label: 'PAUSE', fn: pauseMaintenance }, { label: 'REPAIR DONE', fn: completeRepair }],
    PAUSED:      [{ label: 'RESUME', fn: resumeMaintenance }],
    REPAIRED:    [{ label: 'START TESTING', fn: startTesting }],
    TESTING:     [{ label: 'RETURN TO SERVICE', fn: returnToService }],
    COMPLETED:   []
};

function renderMaintenancePanel() {
    const el = document.getElementById('maintenance-list');
    const historyEl = document.getElementById('maintenance-history');
    const partsEl = document.getElementById('spare-parts-list');
    if (!el) return;

    const active = FactoryState.maintenanceJobs.filter(j => j.status !== 'COMPLETED').slice(0, 20);
    const completed = FactoryState.maintenanceJobs.filter(j => j.status === 'COMPLETED').slice(0, 10);

    el.innerHTML = active.length === 0 ? '<p class="no-results">No active maintenance jobs.</p>' : active.map(j => {
        const actions = MAINT_ACTIONS[j.status] || [];
        const btns = actions.map(a => '<button class="maint-btn" data-job="' + j.jobId + '" data-action="' + a.label + '">' + a.label + '</button>').join('');
        return '<div class="maint-item">' +
            '<div class="maint-main">' +
            '<span class="maint-id">' + j.jobId + '</span>' +
            '<span class="maint-machine">' + j.machineId + '</span>' +
            '<span class="maint-status">' + j.status.replace('_', ' ') + '</span>' +
            '<span class="maint-reason">' + j.reason + '</span>' +
            (j.technician ? '<span class="maint-tech">Tech: ' + j.technician + '</span>' : '') +
            '</div>' +
            '<div class="maint-actions">' + btns + '</div>' +
            (j.repairNotes.length ? '<div class="maint-notes">Notes: ' + j.repairNotes.join('; ') + '</div>' : '') +
            '</div>';
    }).join('');

    el.querySelectorAll('.maint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const jobId = btn.getAttribute('data-job');
            const label = btn.getAttribute('data-action');
            const job = FactoryState.maintenanceJobs.find(j => j.jobId === jobId);
            if (!job) return;
            const action = (MAINT_ACTIONS[job.status] || []).find(a => a.label === label);
            if (action) action.fn(jobId);
        });
    });

    if (historyEl) {
        historyEl.innerHTML = completed.length === 0 ? '<p class="no-results">No completed jobs yet.</p>' : completed.map(j =>
            '<div class="maint-history-item"><span>' + j.jobId + '</span><span>' + j.machineId + '</span><span>Downtime: ' + j.downtimeMinutes + ' min</span><span>Tech: ' + j.technician + '</span></div>'
        ).join('');
    }

    if (partsEl) {
        partsEl.innerHTML = SPARE_PARTS.map(p => '<div class="part-item"><span>' + p.name + '</span><span>Stock: ' + p.stock + '</span></div>').join('');
    }
}

if (typeof module !== "undefined") {
    module.exports = { createMaintenanceJob, assignTechnician, startMaintenance, pauseMaintenance, resumeMaintenance, completeRepair, startTesting, returnToService, renderMaintenancePanel };
}
