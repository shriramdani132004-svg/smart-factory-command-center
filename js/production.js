// production.js
// Phase 12: Production Order Management

const ORDER_STATES = ['CREATED', 'QUEUED', 'ASSIGNED', 'RUNNING', 'PAUSED', 'DELAYED', 'COMPLETED', 'CANCELLED'];
let orderCounter = 4581;

function createOrder(product, quantity, priority, deadlineHours) {
    orderCounter++;
    const order = {
        orderId: 'ORD-' + orderCounter,
        product: product,
        quantity: quantity,
        priority: priority || 'NORMAL',
        deadline: new Date(Date.now() + (deadlineHours || 24) * 3600000),
        assignedLines: [],
        assignedMachines: [],
        completedQuantity: 0,
        remainingQuantity: quantity,
        progress: 0,
        estimatedCompletion: null,
        status: 'CREATED',
        createdAt: new Date()
    };
    FactoryState.orders.unshift(order);
    if (FactoryState.orders.length > 100) FactoryState.orders.pop();

    logEvent('ORDER_CREATED: ' + order.orderId + ' (' + product + ' x' + quantity + ')');
    order.status = 'QUEUED';

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderOrdersPanel();
    return order;
}

// Assign an order across the best available machines (bridges into Phase 13 allocation)
function assignOrder(orderId) {
    const order = FactoryState.orders.find(o => o.orderId === orderId);
    if (!order || order.status !== 'QUEUED') return;

    const allocation = allocateMachinesForOrder(order);
    if (allocation.length === 0) {
        order.status = 'DELAYED';
        logEvent(order.orderId + ' DELAYED: no compatible machines available');
        renderOrdersPanel();
        return;
    }

    order.assignedMachines = allocation.map(a => a.machineId);
    order.assignedLines = [...new Set(allocation.map(a => a.lineId))];
    order.status = 'ASSIGNED';

    allocation.forEach(a => {
        const machine = getMachine(a.machineId);
        if (machine) machine.currentOrder = order.orderId;
    });

    logEvent(order.orderId + ' ASSIGNED to ' + order.assignedMachines.length + ' machines across ' + order.assignedLines.join(', '));
    order.status = 'RUNNING';

    recalculateKPIs();
    renderKPIs(FactoryState);
    renderOrdersPanel();
}

// Called each tick to progress running orders based on assigned machines' production
function updateOrderProgress() {
    FactoryState.orders.forEach(order => {
        if (order.status !== 'RUNNING') return;

        const assigned = order.assignedMachines.map(id => getMachine(id)).filter(Boolean);
        const activeCount = assigned.filter(m => m.currentStatus === 'RUNNING').length;

        if (activeCount === 0 && assigned.length > 0) {
            order.status = 'DELAYED';
            logEvent(order.orderId + ' DELAYED: all assigned machines stopped');
            renderOrdersPanel();
            return;
        }

        // Simulate incremental completion based on active machines
        const increment = activeCount * (Math.random() * 3 + 1);
        order.completedQuantity = Math.min(order.quantity, order.completedQuantity + increment);
        order.remainingQuantity = order.quantity - order.completedQuantity;
        order.progress = Math.round((order.completedQuantity / order.quantity) * 100);

        if (order.progress >= 100) {
            order.status = 'COMPLETED';
            order.completedQuantity = order.quantity;
            order.remainingQuantity = 0;
            logEvent(order.orderId + ' COMPLETED (' + order.quantity + ' units)');

            assigned.forEach(m => { m.currentOrder = null; });
        } else {
            const remainingRate = activeCount > 0 ? increment : 0.01;
            const secondsLeft = order.remainingQuantity / Math.max(remainingRate, 0.01);
            order.estimatedCompletion = new Date(Date.now() + secondsLeft * 1000);
        }
    });
}

function cancelOrder(orderId) {
    const order = FactoryState.orders.find(o => o.orderId === orderId);
    if (!order || order.status === 'COMPLETED') return;
    order.status = 'CANCELLED';
    order.assignedMachines.forEach(id => {
        const m = getMachine(id);
        if (m) m.currentOrder = null;
    });
    recalculateKPIs();
    renderKPIs(FactoryState);
    renderOrdersPanel();
}

function renderOrdersPanel() {
    const el = document.getElementById('orders-list');
    if (!el) return;
    const active = FactoryState.orders.filter(o => o.status !== 'CANCELLED').slice(0, 15);

    if (active.length === 0) {
        el.innerHTML = '<p class="no-results">No production orders yet.</p>';
        return;
    }

    el.innerHTML = active.map(o => {
        const deadline = o.deadline.toLocaleTimeString('en-GB');
        const lines = o.assignedLines.length ? o.assignedLines.join(', ') : '--';
        let actionBtn = '';
        if (o.status === 'QUEUED') actionBtn = '<button class="order-btn assign-btn" data-id="' + o.orderId + '">ASSIGN</button>';
        if (o.status === 'RUNNING' || o.status === 'DELAYED' || o.status === 'ASSIGNED') actionBtn = '<button class="order-btn cancel-btn" data-id="' + o.orderId + '">CANCEL</button>';

        return '<div class="order-item status-' + o.status.toLowerCase() + '">' +
            '<div class="order-main">' +
            '<span class="order-id">' + o.orderId + '</span>' +
            '<span class="order-product">' + o.product + ' x' + o.quantity.toLocaleString() + '</span>' +
            '<span class="order-status-tag">' + o.status + '</span>' +
            '<span class="order-lines">Lines: ' + lines + '</span>' +
            '<span class="order-deadline">Deadline: ' + deadline + '</span>' +
            '</div>' +
            '<div class="order-progress-wrap">' +
            '<div class="order-progress-bar"><div class="order-progress-fill" style="width:' + o.progress + '%"></div></div>' +
            '<span class="order-progress-label">' + o.progress + '%</span>' +
            actionBtn +
            '</div></div>';
    }).join('');

    el.querySelectorAll('.assign-btn').forEach(btn => {
        btn.addEventListener('click', () => assignOrder(btn.getAttribute('data-id')));
    });
    el.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => cancelOrder(btn.getAttribute('data-id')));
    });
}

function initOrderForm() {
    document.getElementById('order-create-btn').addEventListener('click', () => {
        const product = document.getElementById('order-product').value || 'P-100';
        const qty = parseInt(document.getElementById('order-qty').value) || 1000;
        const priority = document.getElementById('order-priority').value;
        createOrder(product, qty, priority, 24);
        document.getElementById('order-qty').value = '';
    });
}

if (typeof module !== "undefined") {
    module.exports = { createOrder, assignOrder, updateOrderProgress, cancelOrder, renderOrdersPanel, initOrderForm };
}
