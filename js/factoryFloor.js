// factoryFloor.js
// Phase 6: Interactive Factory Floor Visualization

const FloorFilters = {
    search: "",
    status: "ALL",
    lineId: "ALL",
    machineType: "ALL"
};

const STATUS_COLORS = {
    RUNNING: "#3fb950",       // GREEN
    WARNING: "#d29922",       // YELLOW
    MAINTENANCE: "#f0883e",   // ORANGE
    FAULT: "#f85149",         // RED
    OFFLINE: "#8b949e",       // GRAY
    IDLE: "#58a6ff",          // BLUE
    PAUSED: "#58a6ff",
    STOPPED: "#8b949e",
    STARTING: "#3fb950",
    STOPPING: "#d29922",
    EMERGENCY_STOP: "#f85149"
};

function getDisplayStatus(machine) {
    // Map internal state to floor display bucket
    if (machine.currentStatus === "FAULT") return "FAULT";
    if (machine.currentStatus === "MAINTENANCE") return "MAINTENANCE";
    if (machine.currentStatus === "OFFLINE") return "OFFLINE";
    if (machine.currentStatus === "RUNNING" && machine.sensors &&
        (machine.sensors.temperature > machine.operatingLimits.tempMax * 0.9 ||
         machine.sensors.vibration > machine.operatingLimits.vibrationMax * 0.9)) {
        return "WARNING";
    }
    if (machine.currentStatus === "RUNNING") return "RUNNING";
    return "IDLE";
}

function applyFilters(machines) {
    return machines.filter(m => {
        const displayStatus = getDisplayStatus(m);
        if (FloorFilters.search && !m.machineId.toLowerCase().includes(FloorFilters.search.toLowerCase())) return false;
        if (FloorFilters.status !== "ALL" && displayStatus !== FloorFilters.status) return false;
        if (FloorFilters.lineId !== "ALL" && m.lineId !== FloorFilters.lineId) return false;
        if (FloorFilters.machineType !== "ALL" && m.machineType !== FloorFilters.machineType) return false;
        return true;
    });
}

function groupByLine(machines) {
    const groups = {};
    machines.forEach(m => {
        if (!groups[m.lineId]) groups[m.lineId] = [];
        groups[m.lineId].push(m);
    });
    return groups;
}

function renderFactoryFloor(allMachines) {
    const floorEl = document.getElementById("factory-floor");
    if (!floorEl) return;

    const filtered = applyFilters(allMachines);
    const grouped = groupByLine(filtered);
    const lineIds = Object.keys(grouped).sort();

    if (lineIds.length === 0) {
        floorEl.innerHTML = '<p class="no-results">No machines match the current filters.</p>';
        return;
    }

    let html = "";
    lineIds.forEach(lineId => {
        html += '<div class="floor-line">';
        html += '<h3 class="floor-line-title">' + lineId + '</h3>';
        html += '<div class="floor-machine-grid">';
        grouped[lineId].forEach(m => {
            const status = getDisplayStatus(m);
            const color = STATUS_COLORS[status];
            html += '<div class="floor-machine" data-machine-id="' + m.machineId + '" style="border-color:' + color + '" title="' + m.machineType + ' - ' + status + '">';
            html += '<span class="floor-dot" style="background:' + color + '"></span>';
            html += '<span class="floor-id">' + m.machineId + '</span>';
            html += '</div>';
        });
        html += '</div></div>';
    });

    floorEl.innerHTML = html;

    // Click-to-inspect
    floorEl.querySelectorAll(".floor-machine").forEach(el => {
        el.addEventListener("click", () => {
            const id = el.getAttribute("data-machine-id");
            const machine = getMachine(id);
            openMachineDetail(id);
        });
    });
}

function showMachinePopup(machine) {
    if (!machine) return;
    const s = machine.sensors || {};
    const m = machine.metrics || {};
    alert(
        "Machine: " + machine.machineId + "\\n" +
        "Type: " + machine.machineType + "\\n" +
        "Status: " + machine.currentStatus + "\\n" +
        "Temp: " + s.temperature + "C  RPM: " + s.rpm + "  Vibration: " + s.vibration + "\\n" +
        "Production: " + m.productionCount + "  Efficiency: " + m.efficiency + "%"
    );
}

function populateFloorFilterOptions(machines) {
    const lineSelect = document.getElementById("filter-line");
    const typeSelect = document.getElementById("filter-type");
    if (!lineSelect || !typeSelect) return;

    const lines = [...new Set(machines.map(m => m.lineId))].sort();
    const types = [...new Set(machines.map(m => m.machineType))].sort();

    lineSelect.innerHTML = '<option value="ALL">All Lines</option>' + lines.map(l => '<option value="' + l + '">' + l + '</option>').join("");
    typeSelect.innerHTML = '<option value="ALL">All Types</option>' + types.map(t => '<option value="' + t + '">' + t + '</option>').join("");
}

function initFactoryFloorControls(machines) {
    populateFloorFilterOptions(machines);

    document.getElementById("floor-search").addEventListener("input", (e) => {
        FloorFilters.search = e.target.value;
        renderFactoryFloor(FactoryState.machines);
    });
    document.getElementById("filter-status").addEventListener("change", (e) => {
        FloorFilters.status = e.target.value;
        renderFactoryFloor(FactoryState.machines);
    });
    document.getElementById("filter-line").addEventListener("change", (e) => {
        FloorFilters.lineId = e.target.value;
        renderFactoryFloor(FactoryState.machines);
    });
    document.getElementById("filter-type").addEventListener("change", (e) => {
        FloorFilters.machineType = e.target.value;
        renderFactoryFloor(FactoryState.machines);
    });
}

if (typeof module !== "undefined") {
    module.exports = { renderFactoryFloor, applyFilters, getDisplayStatus, initFactoryFloorControls };
}
