// simulator.js
// Real-time machine simulation engine - generates data every second (Phase 3)

const SIMULATION_CONFIG = {
    speed: 1,          // 1x, 2x, 5x, 10x
    intervalMs: 1000,  // base tick = 1 real second
    running: false
};

// Machine-specific baseline operating ranges
function getBaseline(machineType) {
    const baselines = {
        "CNC Machine":              { temp: 65, rpm: 2400, vibration: 2.0 },
        "Robotic Arm":              { temp: 55, rpm: 1200, vibration: 1.5 },
        "Conveyor":                 { temp: 40, rpm: 800,  vibration: 1.0 },
        "Press Machine":            { temp: 70, rpm: 600,  vibration: 3.5 },
        "Welding Robot":            { temp: 85, rpm: 0,    vibration: 2.5 },
        "Assembly Robot":           { temp: 50, rpm: 1500, vibration: 1.2 },
        "Packaging Machine":        { temp: 45, rpm: 900,  vibration: 1.8 },
        "Cutting Machine":          { temp: 75, rpm: 3000, vibration: 3.0 },
        "Drilling Machine":         { temp: 60, rpm: 2200, vibration: 2.8 },
        "Injection Molding Machine":{ temp: 90, rpm: 400,  vibration: 2.2 }
    };
    return baselines[machineType] || { temp: 60, rpm: 1000, vibration: 2.0 };
}

// Initialize live sensor data on each machine object
function initMachineData(machine) {
    const base = getBaseline(machine.machineType);
    machine.sensors = {
        temperature: base.temp,
        pressure: 5.0,
        rpm: base.rpm,
        vibration: base.vibration,
        voltage: 220,
        current: 10,
        powerConsumption: 5.0
    };
    machine.metrics = {
        productionCount: 0,
        utilization: 0,
        operatingTime: 0,
        downtime: 0,
        cycleTime: 30,
        efficiency: 100,
        errorCount: 0
    };
    return machine;
}

// Apply one tick of random variation / gradual degradation / faults
function simulateTick(machine) {
    if (!machine.sensors) initMachineData(machine);
    const base = getBaseline(machine.machineType);
    const s = machine.sensors;
    const m = machine.metrics;

    if (machine.currentStatus === "RUNNING") {
        // Normal random variation
        s.temperature += (Math.random() - 0.45) * 1.5;
        s.rpm += (Math.random() - 0.5) * 20;
        s.vibration += (Math.random() - 0.45) * 0.3;
        s.voltage += (Math.random() - 0.5) * 2;
        s.current += (Math.random() - 0.5) * 0.5;
        s.powerConsumption = (s.voltage * s.current) / 1000;

        // Production increments
        if (Math.random() > 0.3) {
            m.productionCount += 1;
        }
        m.operatingTime += 1;
        m.utilization = Math.min(100, m.utilization + 0.1);

        // Random minor fault chance
        if (Math.random() < 0.002) {
            s.temperature += 10;
            s.vibration += 3;
            m.errorCount += 1;
        }

        // Major fault / anomaly threshold check
        if (s.temperature > machine.operatingLimits.tempMax || s.vibration > machine.operatingLimits.vibrationMax) {
            machine.currentStatus = "FAULT";
        }

        // Clamp to baseline drift range (gradual recovery pull)
        s.temperature += (base.temp - s.temperature) * 0.01;
        s.vibration += (base.vibration - s.vibration) * 0.01;

        m.efficiency = Math.max(0, 100 - (m.errorCount * 5) - Math.max(0, s.vibration - base.vibration) * 3);
    } else if (machine.currentStatus === "IDLE" || machine.currentStatus === "STOPPED") {
        m.downtime += 1;
        s.rpm = Math.max(0, s.rpm * 0.9);
    }

    // Round values for display
    s.temperature = Math.round(s.temperature * 10) / 10;
    s.rpm = Math.round(s.rpm);
    s.vibration = Math.round(s.vibration * 10) / 10;
    s.powerConsumption = Math.round(s.powerConsumption * 100) / 100;

    return machine;
}

// Run one simulation tick across all machines
function simulateAllMachines(machines) {
    machines.forEach(simulateTick);
    return machines;
}

// Start the real-time loop (called from app.js)
function startSimulation(machines, onTick) {
    SIMULATION_CONFIG.running = true;
    return setInterval(() => {
        if (!SIMULATION_CONFIG.running) return;
        simulateAllMachines(machines);
        if (onTick) onTick(machines);
    }, SIMULATION_CONFIG.intervalMs / SIMULATION_CONFIG.speed);
}

function stopSimulation(intervalId) {
    SIMULATION_CONFIG.running = false;
    clearInterval(intervalId);
}

function setSimulationSpeed(multiplier) {
    SIMULATION_CONFIG.speed = multiplier;
}

if (typeof module !== "undefined") {
    module.exports = {
        SIMULATION_CONFIG, getBaseline, initMachineData,
        simulateTick, simulateAllMachines, startSimulation,
        stopSimulation, setSimulationSpeed
    };
}
