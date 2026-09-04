// maintenance.js
// Minimal maintenance job creation (supports Phase 11 automation; full Phase 16 module lands later)

let maintenanceCounter = 0;

function createMaintenanceJob(machineId, reason) {
    maintenanceCounter++;
    const job = {
        jobId: 'MJ-' + String(maintenanceCounter).padStart(4, '0'),
        machineId: machineId,
        reason: reason,
        createdAt: new Date(),
        status: 'PENDING'
    };
    FactoryState.maintenanceJobs.unshift(job);
    if (FactoryState.maintenanceJobs.length > 200) FactoryState.maintenanceJobs.pop();

    const machine = getMachine(machineId);
    if (machine) machine.maintenanceStatus = 'PENDING';

    return job;
}

if (typeof module !== "undefined") {
    module.exports = { createMaintenanceJob };
}
