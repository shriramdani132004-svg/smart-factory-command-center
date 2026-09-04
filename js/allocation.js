// allocation.js
// Phase 13: Machine Allocation & Workload Balancing Engine
// Process: Order -> Find Compatible -> Remove Faulted -> Check Availability -> Score -> Select Best -> Assign -> Track

const PRODUCT_MACHINE_COMPATIBILITY = {
    // Which machine types can produce which products (simple mapping; extendable)
    default: ['CNC Machine', 'Robotic Arm', 'Assembly Robot', 'Press Machine', 'Cutting Machine', 'Drilling Machine', 'Injection Molding Machine']
};

function getCompatibleTypes(product) {
    return PRODUCT_MACHINE_COMPATIBILITY[product] || PRODUCT_MACHINE_COMPATIBILITY.default;
}

// Step 1: Find machines compatible with this order's product
function findCompatibleMachines(order) {
    const compatibleTypes = getCompatibleTypes(order.product);
    return FactoryState.machines.filter(m => compatibleTypes.includes(m.machineType));
}

// Step 2: Remove faulted/offline/maintenance machines
function removeUnavailableMachines(machines) {
    return machines.filter(m =>
        m.currentStatus !== 'FAULT' &&
        m.currentStatus !== 'OFFLINE' &&
        m.currentStatus !== 'MAINTENANCE' &&
        m.currentStatus !== 'EMERGENCY_STOP'
    );
}

// Step 3: Check availability (not already tied to another order)
function checkAvailability(machines) {
    return machines.filter(m => !m.currentOrder);
}

// Step 4: Calculate a composite score per machine (0-100, higher = better choice)
function calculateMachineScore(machine, order) {
    let score = 0;

    // Health: fewer errors + lower vibration/temp relative to limits = healthier
    const errorCount = machine.metrics ? machine.metrics.errorCount : 0;
    const healthScore = Math.max(0, 100 - errorCount * 8);
    score += healthScore * 0.30;

    // Availability bonus: IDLE/STOPPED preferred over RUNNING (less disruption)
    const availabilityScore = (machine.currentStatus === 'IDLE' || machine.currentStatus === 'STOPPED') ? 100 : 40;
    score += availabilityScore * 0.25;

    // Current workload: lower utilization = more headroom
    const utilization = machine.metrics ? machine.metrics.utilization : 0;
    const workloadScore = Math.max(0, 100 - utilization);
    score += workloadScore * 0.20;

    // Production capacity: higher capacity = better fit for large orders
    const capacityScore = Math.min(100, (machine.productionCapacity / 1000) * 100);
    score += capacityScore * 0.15;

    // Energy efficiency: lower current power draw = better
    const power = machine.sensors ? machine.sensors.powerConsumption : 2;
    const energyScore = Math.max(0, 100 - power * 5);
    score += energyScore * 0.05;

    // Downtime penalty
    const downtime = machine.metrics ? machine.metrics.downtime : 0;
    const downtimeScore = Math.max(0, 100 - downtime * 0.5);
    score += downtimeScore * 0.05;

    // Priority/deadline boost: URGENT orders favor RUNNING-capable healthy machines more heavily
    if (order.priority === 'URGENT' || order.priority === 'HIGH') {
        score += healthScore * 0.1;
    }

    return Math.round(score * 10) / 10;
}

// Step 5: Select best-scoring machines, spread across lines for resilience
function selectBestMachines(scoredMachines, maxCount) {
    const sorted = [...scoredMachines].sort((a, b) => b.score - a.score);
    const selected = [];
    const usedLines = new Set();

    // First pass: best machine per line (spread workload)
    for (const entry of sorted) {
        if (selected.length >= maxCount) break;
        if (!usedLines.has(entry.machine.lineId)) {
            selected.push(entry);
            usedLines.add(entry.machine.lineId);
        }
    }
    // Second pass: fill remaining slots with next-best regardless of line
    for (const entry of sorted) {
        if (selected.length >= maxCount) break;
        if (!selected.includes(entry)) selected.push(entry);
    }

    return selected;
}

// Full pipeline: Production Order -> ... -> Assign Production -> Track Progress
function allocateMachinesForOrder(order) {
    let candidates = findCompatibleMachines(order);
    candidates = removeUnavailableMachines(candidates);
    candidates = checkAvailability(candidates);

    if (candidates.length === 0) return [];

    const scored = candidates.map(m => ({ machine: m, score: calculateMachineScore(m, order) }));

    const maxMachines = order.priority === 'URGENT' ? 6 : (order.priority === 'HIGH' ? 5 : 4);
    const best = selectBestMachines(scored, maxMachines);

    logEvent('Allocation for ' + order.orderId + ': scored ' + scored.length + ' candidates, selected ' + best.length +
        ' (top score: ' + (best[0] ? best[0].score : 0) + ')');

    best.forEach(entry => {
        const m = entry.machine;
        if (m.currentStatus === 'IDLE' || m.currentStatus === 'STOPPED') {
            m.currentStatus = 'RUNNING';
        }
    });

    return best.map(entry => ({ machineId: entry.machine.machineId, lineId: entry.machine.lineId, score: entry.score }));
}

function renderAllocationDebug(order, allocation) {
    const el = document.getElementById('allocation-debug');
    if (!el) return;
    if (!allocation || allocation.length === 0) {
        el.innerHTML = '<p class="no-results">No allocation data yet. Create and assign an order to see scoring.</p>';
        return;
    }
    el.innerHTML = '<div class="alloc-title">Last allocation: ' + order.orderId + '</div>' +
        allocation.map(a => '<div class="alloc-row"><span>' + a.machineId + '</span><span>' + a.lineId + '</span><span class="alloc-score">Score: ' + a.score + '</span></div>').join('');
}

if (typeof module !== "undefined") {
    module.exports = { findCompatibleMachines, removeUnavailableMachines, checkAvailability, calculateMachineScore, selectBestMachines, allocateMachinesForOrder };
}
