// machine.js - 250 machines across 10 production lines

function createMachine(id, type, lineId, locationLabel) {
    return {
        machineId: id,
        machineType: type,
        location: locationLabel,
        lineId: lineId,
        capabilities: [],
        productionCapacity: Math.floor(Math.random() * 500) + 500,
        operatingLimits: {
            tempMax: 90,
            rpmMax: 3000,
            vibrationMax: 8
        },
        currentStatus: "IDLE",
        currentJob: null,
        maintenanceStatus: "OK"
    };
}

function generateInitialMachines(count) {
    const machines = [];
    const lines = ["LINE-01","LINE-02","LINE-03","LINE-04","LINE-05","LINE-06","LINE-07","LINE-08","LINE-09","LINE-10"];

    for (let i = 1; i <= count; i++) {
        const id = "M" + String(i).padStart(3, "0");
        const type = MACHINE_TYPES[i % MACHINE_TYPES.length];
        const lineId = lines[i % lines.length];
        const location = lineId + "-POS-" + i;
        machines.push(createMachine(id, type, lineId, location));
    }
    return machines;
}

// 250 machines (upgraded from initial 50 for full-scale demo)
const MACHINES = generateInitialMachines(250);

if (typeof module !== "undefined") {
    module.exports = { createMachine, generateInitialMachines, MACHINES };
}
