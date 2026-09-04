// machineDetail.js
// Phase 7: Machine Detail & Control Center panel

let currentDetailMachineId = null;

function openMachineDetail(machineId) {
    currentDetailMachineId = machineId;
    const panel = document.getElementById('detail-panel');
    panel.classList.add('open');
    renderMachineDetail(machineId);
}

function closeMachineDetail() {
    currentDetailMachineId = null;
    document.getElementById('detail-panel').classList.remove('open');
}

function renderMachineDetail(machineId) {
    const machine = getMachine(machineId);
    if (!machine) return;
    const s = machine.sensors || {};
    const m = machine.metrics || {};
    const status = machine.currentStatus;

    document.getElementById('detail-title').textContent = machine.machineId + ' - ' + machine.machineType;
    document.getElementById('detail-status').textContent = status;
    document.getElementById('detail-status').className = 'status-badge status-' + status;

    document.getElementById('detail-body').innerHTML =
        '<div class="detail-row"><span>Location</span><span>' + machine.location + '</span></div>' +
        '<div class="detail-row"><span>Line</span><span>' + machine.lineId + '</span></div>' +
        '<div class="detail-row"><span>Temperature</span><span>' + s.temperature + ' C</span></div>' +
        '<div class="detail-row"><span>RPM</span><span>' + s.rpm + '</span></div>' +
        '<div class="detail-row"><span>Vibration</span><span>' + s.vibration + '</span></div>' +
        '<div class="detail-row"><span>Pressure</span><span>' + s.pressure + '</span></div>' +
        '<div class="detail-row"><span>Power</span><span>' + s.powerConsumption + ' kW</span></div>' +
        '<div class="detail-row"><span>Production</span><span>' + m.productionCount + '</span></div>' +
        '<div class="detail-row"><span>Efficiency</span><span>' + m.efficiency + '%</span></div>' +
        '<div class="detail-row"><span>Error Count</span><span>' + m.errorCount + '</span></div>' +
        '<div class="detail-row"><span>Maintenance</span><span>' + machine.maintenanceStatus + '</span></div>';
}

function handleControlClick(action) {
    if (!currentDetailMachineId) return;
    const result = sendCommand(currentDetailMachineId, action, 'OPERATOR');
    if (!result.ok) {
        alert(result.message);
    }
    renderMachineDetail(currentDetailMachineId);
}

function initMachineDetailControls() {
    document.getElementById('detail-close').addEventListener('click', closeMachineDetail);
    document.getElementById('btn-start').addEventListener('click', () => handleControlClick('START'));
    document.getElementById('btn-stop').addEventListener('click', () => handleControlClick('STOP'));
    document.getElementById('btn-pause').addEventListener('click', () => handleControlClick('PAUSE'));
    document.getElementById('btn-resume').addEventListener('click', () => handleControlClick('RESUME'));
    document.getElementById('btn-reset').addEventListener('click', () => handleControlClick('RESET'));
    document.getElementById('btn-estop').addEventListener('click', () => handleControlClick('EMERGENCY_STOP'));
}

if (typeof module !== "undefined") {
    module.exports = { openMachineDetail, closeMachineDetail, renderMachineDetail };
}
