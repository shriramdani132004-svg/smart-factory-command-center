// analytics.js - Phase 16: Factory Analytics
// Records a snapshot every tick, renders trend charts with time-range filters

const AnalyticsHistory = [];
const MAX_HISTORY_POINTS = 5000;
let currentTimeRange = '1h';
const chartInstances = {};

function recordAnalyticsSnapshot(state) {
    const k = state.kpis;
    const healthValues = state.machines.filter(m => m.prediction).map(m => m.prediction.healthScore);
    const avgHealth = healthValues.length ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length) : 100;

    const faultEventsSinceLastSnapshot = state.machines.filter(m => m.currentStatus === 'FAULT').length;
    const maintenanceActive = state.maintenanceJobs.filter(j => j.status !== 'COMPLETED').length;

    AnalyticsHistory.push({
        timestamp: new Date(),
        production: k.productionToday,
        efficiency: k.efficiency,
        energy: k.energyConsumption,
        downtime: state.machines.reduce((sum, m) => sum + (m.metrics ? m.metrics.downtime : 0), 0),
        faultCount: faultEventsSinceLastSnapshot,
        maintenanceCount: maintenanceActive,
        avgHealth: avgHealth,
        running: k.running
    });

    if (AnalyticsHistory.length > MAX_HISTORY_POINTS) AnalyticsHistory.shift();
}

function getRangeMs(range) {
    switch (range) {
        case '1h': return 3600000;
        case 'today': return 86400000;
        case '7d': return 7 * 86400000;
        case '30d': return 30 * 86400000;
        default: return 3600000;
    }
}

function filterHistoryByRange(range) {
    const cutoff = Date.now() - getRangeMs(range);
    const filtered = AnalyticsHistory.filter(h => h.timestamp.getTime() >= cutoff);
    // Downsample to keep charts fast if there are a lot of points
    if (filtered.length > 100) {
        const step = Math.ceil(filtered.length / 100);
        return filtered.filter((_, i) => i % step === 0);
    }
    return filtered;
}

function buildChart(canvasId, label, dataPoints, color, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color + '22',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8b949e', maxTicksLimit: 6 }, grid: { color: '#21262d' } },
                y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
            }
        }
    });
}

function renderAnalyticsCharts() {
    const data = filterHistoryByRange(currentTimeRange);
    if (data.length === 0) return;

    const labels = data.map(h => h.timestamp.toLocaleTimeString('en-GB'));

    buildChart('chart-production', 'Production', data.map(h => h.production), '#3fb950', labels);
    buildChart('chart-efficiency', 'Efficiency %', data.map(h => h.efficiency), '#58a6ff', labels);
    buildChart('chart-energy', 'Energy (kWh)', data.map(h => h.energy), '#d29922', labels);
    buildChart('chart-downtime', 'Downtime (ticks)', data.map(h => h.downtime), '#f85149', labels);
    buildChart('chart-health', 'Avg Machine Health %', data.map(h => h.avgHealth), '#a371f7', labels);
    buildChart('chart-faults', 'Machines in Fault', data.map(h => h.faultCount), '#f0883e', labels);
    buildChart('chart-maintenance', 'Active Maintenance Jobs', data.map(h => h.maintenanceCount), '#39c5cf', labels);

    const summaryEl = document.getElementById('analytics-summary');
    if (summaryEl) {
        const latest = data[data.length - 1];
        summaryEl.innerHTML =
            '<div class="analytics-stat"><span>Data Points</span><span>' + AnalyticsHistory.length + '</span></div>' +
            '<div class="analytics-stat"><span>Current Production</span><span>' + latest.production.toLocaleString() + '</span></div>' +
            '<div class="analytics-stat"><span>Current Efficiency</span><span>' + latest.efficiency + '%</span></div>' +
            '<div class="analytics-stat"><span>Avg Machine Health</span><span>' + latest.avgHealth + '%</span></div>';
    }
}

function setTimeRange(range) {
    currentTimeRange = range;
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === range);
    });
    renderAnalyticsCharts();
}

function initAnalyticsControls() {
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setTimeRange(btn.getAttribute('data-range')));
    });
}

if (typeof module !== "undefined") {
    module.exports = { recordAnalyticsSnapshot, filterHistoryByRange, renderAnalyticsCharts, setTimeRange, initAnalyticsControls };
}
