// ai.js - Phase 14: Predictive Maintenance (rule-based anomaly scoring)
// Inputs: temp/vibration/rpm/pressure/power trends, error frequency, downtime, operating hours
// Output: health score, anomaly score, failure probability, recommendation

const HISTORY_LENGTH = 20;

function recordSensorHistory(machine) {
    if (!machine._history) {
        machine._history = { temp: [], vibration: [], rpm: [], pressure: [], power: [] };
    }
    const h = machine._history;
    const s = machine.sensors;
    if (!s) return;

    h.temp.push(s.temperature);       if (h.temp.length > HISTORY_LENGTH) h.temp.shift();
    h.vibration.push(s.vibration);    if (h.vibration.length > HISTORY_LENGTH) h.vibration.shift();
    h.rpm.push(s.rpm);                if (h.rpm.length > HISTORY_LENGTH) h.rpm.shift();
    h.pressure.push(s.pressure);      if (h.pressure.length > HISTORY_LENGTH) h.pressure.shift();
    h.power.push(s.powerConsumption); if (h.power.length > HISTORY_LENGTH) h.power.shift();
}

function trendDelta(arr) {
    if (!arr || arr.length < 2) return 0;
    return arr[arr.length - 1] - arr[0];
}

function stdDev(arr) {
    if (!arr || arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
    return Math.sqrt(variance);
}

function calculateHealthScore(machine) {
    const limits = machine.operatingLimits;
    const s = machine.sensors || {};
    const m = machine.metrics || {};
    let score = 100;

    const tempRatio = limits.tempMax ? (s.temperature || 0) / limits.tempMax : 0;
    const vibRatio = limits.vibrationMax ? (s.vibration || 0) / limits.vibrationMax : 0;

    score -= Math.max(0, tempRatio - 0.7) * 100 * 0.6;
    score -= Math.max(0, vibRatio - 0.7) * 100 * 0.6;
    score -= (m.errorCount || 0) * 4;
    score -= Math.min(20, (m.downtime || 0) * 0.1);

    return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateAnomalyScore(machine) {
    const h = machine._history;
    if (!h) return 0;

    const tempStd = stdDev(h.temp);
    const vibStd = stdDev(h.vibration);
    const tempTrend = Math.abs(trendDelta(h.temp));
    const vibTrend = Math.abs(trendDelta(h.vibration));

    const score = (tempStd * 3) + (vibStd * 10) + (tempTrend * 2) + (vibTrend * 8);
    return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateFailureProbability(machine, healthScore, anomalyScore) {
    const m = machine.metrics || {};
    const errorFactor = Math.min(30, (m.errorCount || 0) * 6);
    const base = (100 - healthScore) * 0.5 + anomalyScore * 0.4 + errorFactor * 0.3;
    return Math.max(0, Math.min(100, Math.round(base)));
}

function getRecommendation(failureProbability) {
    if (failureProbability >= 80) return 'URGENT: Schedule maintenance immediately';
    if (failureProbability >= 60) return 'Schedule maintenance soon';
    if (failureProbability >= 35) return 'Monitor closely';
    return 'No action needed';
}

function runPredictiveAnalysis(machines) {
    return machines.map(m => {
        const healthScore = calculateHealthScore(m);
        const anomalyScore = calculateAnomalyScore(m);
        const failureProbability = calculateFailureProbability(m, healthScore, anomalyScore);
        const recommendation = getRecommendation(failureProbability);
        m.prediction = { healthScore, anomalyScore, failureProbability, recommendation };

        // Auto-create a maintenance job for high-risk machines (bridges into Phase 15)
        if (failureProbability >= 80 && !m._predictiveJobCreated) {
            if (typeof createMaintenanceJob === 'function') {
                createMaintenanceJob(m.machineId, 'Predictive: failure probability ' + failureProbability + '%');
                logEvent('PREDICTIVE ALERT: ' + m.machineId + ' failure probability ' + failureProbability + '% - maintenance job created');
            }
            m._predictiveJobCreated = true;
        } else if (failureProbability < 60) {
            m._predictiveJobCreated = false;
        }

        return { machineId: m.machineId, healthScore, anomalyScore, failureProbability, recommendation };
    });
}

function renderPredictivePanel(machines) {
    const el = document.getElementById('predictive-list');
    if (!el) return;

    const results = machines.map(m => m.prediction ? Object.assign({ machineId: m.machineId }, m.prediction) : null).filter(Boolean);
    results.sort((a, b) => b.failureProbability - a.failureProbability);
    const top = results.slice(0, 10);

    if (top.length === 0) {
        el.innerHTML = '<p class="no-results">Gathering sensor history...</p>';
        return;
    }

    el.innerHTML = top.map(r => {
        const riskClass = r.failureProbability >= 80 ? 'risk-critical' : r.failureProbability >= 60 ? 'risk-high' : r.failureProbability >= 35 ? 'risk-medium' : 'risk-low';
        return '<div class="predict-item ' + riskClass + '">' +
            '<span class="predict-id">' + r.machineId + '</span>' +
            '<span class="predict-metric">Health: ' + r.healthScore + '%</span>' +
            '<span class="predict-metric">Anomaly: ' + r.anomalyScore + '%</span>' +
            '<span class="predict-metric">Failure Prob: ' + r.failureProbability + '%</span>' +
            '<span class="predict-rec">' + r.recommendation + '</span>' +
            '</div>';
    }).join('');
}

if (typeof module !== "undefined") {
    module.exports = { recordSensorHistory, calculateHealthScore, calculateAnomalyScore, calculateFailureProbability, getRecommendation, runPredictiveAnalysis, renderPredictivePanel };
}
