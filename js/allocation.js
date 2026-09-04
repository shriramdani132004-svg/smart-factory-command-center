// allocation.js
// Minimal machine allocation to support Phase 12 order assignment (full scoring engine lands in Phase 13)

function allocateMachinesForOrder(order) {
    const compatible = FactoryState.machines.filter(m =>
        m.currentStatus !== 'FAULT' &&
        m.currentStatus !== 'OFFLINE' &&
        m.currentStatus !== 'MAINTENANCE' &&
        !m.currentOrder
    );

    // Pick up to 4 machines, spread across different lines where possible
    const byLine = {};
    compatible.forEach(m => {
        if (!byLine[m.lineId]) byLine[m.lineId] = [];
        byLine[m.lineId].push(m);
    });

    const selected = [];
    const lineIds = Object.keys(byLine);
    let i = 0;
    while (selected.length < 4 && selected.length < compatible.length && i < 20) {
        const lineId = lineIds[i % lineIds.length];
        const candidates = byLine[lineId];
        if (candidates && candidates.length > 0) {
            const m = candidates.shift();
            selected.push({ machineId: m.machineId, lineId: m.lineId });
            if (m.currentStatus === 'IDLE' || m.currentStatus === 'STOPPED') {
                m.currentStatus = 'RUNNING';
            }
        }
        i++;
        if (lineIds.every(l => !byLine[l] || byLine[l].length === 0)) break;
    }

    return selected;
}

if (typeof module !== "undefined") {
    module.exports = { allocateMachinesForOrder };
}
