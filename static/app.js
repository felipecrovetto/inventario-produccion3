// API Configuration
const API_BASE_URL = '';

// Global state
let currentData = {
    products: [],
    stages: [],
    substages: [],
    locations: [],
    movements: [],
    alerts: []
};

let charts = {};

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-ES');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// API calls
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE_URL + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showToast(`Error en la API: ${error.message}`, 'error');
        throw error;
    }
}

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked nav button
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    // Load section-specific data
    loadSectionData(sectionId);
}

async function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'productos':
            await loadProducts();
            break;
        case 'etapas':
            await loadStages();
            break;
        case 'sub-etapas':
            await loadSubstages();
            break;
        case 'locaciones':
            await loadLocations();
            break;
        case 'movimientos':
            await loadMovements();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const dashboardData = await apiCall('/api/dashboard');
        
        // Update KPIs
        document.getElementById('totalProducts').textContent = dashboardData.total_products;
        document.getElementById('totalStages').textContent = dashboardData.total_stages;
        document.getElementById('totalLocations').textContent = dashboardData.total_locations;
        document.getElementById('totalCost').textContent = formatCurrency(dashboardData.total_cost);
        
        // Show alerts
        showStockAlerts(dashboardData.low_stock_alerts);
        
        // Load all charts for dashboard
        await loadDashboardCharts();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function showStockAlerts(alerts) {
    const container = document.getElementById('stockAlerts');
    container.innerHTML = '';
    
    if (alerts.length === 0) {
        return;
    }
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${alert.status === 'crítico' ? 'danger' : 'warning'}`;
        alertDiv.innerHTML = `
            <strong>⚠️ Stock ${alert.status}:</strong> 
            ${alert.product_name} - ${alert.current_stock} ${alert.unit} 
            (Mínimo: ${alert.min_stock} ${alert.unit})
        `;
        container.appendChild(alertDiv);
    });
}

async function loadDashboardCharts() {
    try {
        // Load all chart data in parallel
        const [
            consumptionData,
            stockData,
            locationData,
            stageData,
            expensesData,
            locationExpensesData,
            stageTimeData,
            substageTimeData
        ] = await Promise.all([
            apiCall('/api/graficos/consumo-producto'),
            apiCall('/api/graficos/stock-productos'),
            apiCall('/api/graficos/consumo-locacion'),
            apiCall('/api/graficos/consumo-etapa'),
            apiCall('/api/graficos/gastos-etapa'),
            apiCall('/api/graficos/gastos-locacion'),
            apiCall('/api/graficos/tiempo-etapas'),
            apiCall('/api/graficos/tiempo-sub-etapas')
        ]);
        
        // Create all dashboard charts
        createConsumptionChart('dashboardConsumptionChart', consumptionData);
        createStockChart('dashboardStockChart', stockData);
        createLocationConsumptionChart('dashboardLocationChart', locationData);
        createStageConsumptionChart('dashboardStageChart', stageData);
        createExpensesChart('dashboardExpensesChart', expensesData);
        createLocationExpensesChart('dashboardLocationExpensesChart', locationExpensesData);
        createTimeChart('dashboardStageTimeChart', stageTimeData);
        createTimeChart('dashboardSubstageTimeChart', substageTimeData);
        
    } catch (error) {
        console.error('Error loading dashboard charts:', error);
    }
}

// Products functions
async function loadProducts() {
    try {
        currentData.products = await apiCall('/api/productos');
        renderProductsTable();
        await loadProductCharts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    currentData.products.forEach(product => {
        const row = document.createElement('tr');
        
        let statusClass = '';
        let statusText = 'Normal';
        
        if (product.current_stock === 0) {
            statusClass = 'status-critical';
            statusText = 'Sin Stock';
        } else if (product.current_stock <= product.min_stock) {
            statusClass = 'status-warning';
            statusText = 'Stock Bajo';
        } else {
            statusClass = 'status-success';
        }
        
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.unit}</td>
            <td>${product.current_stock}</td>
            <td>${product.min_stock}</td>
            <td>${formatCurrency(product.price)}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editProduct(${product.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadProductCharts() {
    try {
        const [
            consumptionData,
            stockData,
            locationData,
            stageData
        ] = await Promise.all([
            apiCall('/api/graficos/consumo-producto'),
            apiCall('/api/graficos/stock-productos'),
            apiCall('/api/graficos/consumo-locacion'),
            apiCall('/api/graficos/consumo-etapa')
        ]);
        
        createConsumptionChart('productConsumptionChart', consumptionData);
        createStockChart('productStockChart', stockData);
        createLocationConsumptionChart('productLocationChart', locationData);
        createStageConsumptionChart('productStageChart', stageData);
        
    } catch (error) {
        console.error('Error loading product charts:', error);
    }
}

// Stages functions
async function loadStages() {
    try {
        currentData.stages = await apiCall('/api/etapas');
        renderStagesTable();
        await loadStageCharts();
    } catch (error) {
        console.error('Error loading stages:', error);
    }
}

function renderStagesTable() {
    const tbody = document.getElementById('stagesTableBody');
    tbody.innerHTML = '';
    
    currentData.stages.forEach(stage => {
        const row = document.createElement('tr');
        
        let statusClass = '';
        let statusText = stage.status;
        let actionButtons = '';
        
        switch (stage.status) {
            case 'pending':
                statusClass = 'status-warning';
                statusText = 'Pendiente';
                actionButtons = `<button class="btn btn-sm btn-success" onclick="startStage(${stage.id})">▶️ Iniciar</button>`;
                break;
            case 'in_progress':
                statusClass = 'status-info';
                statusText = 'En Progreso';
                actionButtons = `<button class="btn btn-sm btn-primary" onclick="finishStage(${stage.id})">✅ Finalizar</button>`;
                break;
            case 'completed':
                statusClass = 'status-success';
                statusText = 'Completada';
                break;
        }
        
        const actualDuration = stage.actual_duration !== null ? `${stage.actual_duration} días` : '-';
        
        row.innerHTML = `
            <td>${stage.name}</td>
            <td>${stage.location_name}</td>
            <td>${stage.expected_duration} días</td>
            <td>${actualDuration}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
                ${actionButtons}
                <button class="btn btn-sm btn-outline" onclick="editStage(${stage.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStage(${stage.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadStageCharts() {
    try {
        const [timeData, expensesData] = await Promise.all([
            apiCall('/api/graficos/tiempo-etapas'),
            apiCall('/api/graficos/gastos-etapa')
        ]);
        
        createTimeChart('stageTimeChart', timeData);
        createExpensesChart('stageExpensesChart', expensesData);
        
    } catch (error) {
        console.error('Error loading stage charts:', error);
    }
}

// Substages functions
async function loadSubstages() {
    try {
        currentData.substages = await apiCall('/api/sub-etapas');
        renderSubstagesTable();
        await loadSubstageCharts();
    } catch (error) {
        console.error('Error loading substages:', error);
    }
}

function renderSubstagesTable() {
    const tbody = document.getElementById('substagesTableBody');
    tbody.innerHTML = '';
    
    currentData.substages.forEach(substage => {
        const row = document.createElement('tr');
        
        let statusClass = '';
        let statusText = substage.status;
        let actionButtons = '';
        
        switch (substage.status) {
            case 'pending':
                statusClass = 'status-warning';
                statusText = 'Pendiente';
                actionButtons = `<button class="btn btn-sm btn-success" onclick="startSubstage(${substage.id})">▶️ Iniciar</button>`;
                break;
            case 'in_progress':
                statusClass = 'status-info';
                statusText = 'En Progreso';
                actionButtons = `<button class="btn btn-sm btn-primary" onclick="finishSubstage(${substage.id})">✅ Finalizar</button>`;
                break;
            case 'completed':
                statusClass = 'status-success';
                statusText = 'Completada';
                break;
        }
        
        const actualDuration = substage.actual_duration !== null ? `${substage.actual_duration} días` : '-';
        
        row.innerHTML = `
            <td>${substage.name}</td>
            <td>${substage.stage_name}</td>
            <td>${substage.expected_duration} días</td>
            <td>${actualDuration}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
                ${actionButtons}
                <button class="btn btn-sm btn-outline" onclick="editSubstage(${substage.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSubstage(${substage.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadSubstageCharts() {
    try {
        const timeData = await apiCall('/api/graficos/tiempo-sub-etapas');
        createTimeChart('substageTimeChart', timeData);
    } catch (error) {
        console.error('Error loading substage charts:', error);
    }
}

// Locations functions
async function loadLocations() {
    try {
        currentData.locations = await apiCall('/api/locaciones');
        renderLocationsTable();
        await loadLocationCharts();
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

function renderLocationsTable() {
    const tbody = document.getElementById('locationsTableBody');
    tbody.innerHTML = '';
    
    currentData.locations.forEach(location => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${location.name}</td>
            <td>${location.description}</td>
            <td>${formatDate(location.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editLocation(${location.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadLocationCharts() {
    try {
        const [
            consumptionData,
            expensesData,
            timeData
        ] = await Promise.all([
            apiCall('/api/graficos/consumo-locacion'),
            apiCall('/api/graficos/gastos-locacion'),
            apiCall('/api/graficos/tiempo-locacion')
        ]);
        
        createLocationConsumptionChart('locationConsumptionChart', consumptionData);
        createLocationExpensesChart('locationExpensesChart', expensesData);
        createLocationTimeChart('locationTimeChart', timeData);
        
    } catch (error) {
        console.error('Error loading location charts:', error);
    }
}

// Movements functions
async function loadMovements() {
    try {
        currentData.movements = await apiCall('/api/movimientos');
        renderMovementsTable();
        await loadMovementFilters();
    } catch (error) {
        console.error('Error loading movements:', error);
    }
}

function renderMovementsTable() {
    const tbody = document.getElementById('movementsTableBody');
    tbody.innerHTML = '';
    
    currentData.movements.forEach(movement => {
        const row = document.createElement('tr');
        
        const productsText = movement.products.map(p => 
            `${p.product_name}: ${p.quantity} ${p.unit}`
        ).join(', ');
        
        let typeClass = '';
        let typeText = movement.type;
        
        switch (movement.type) {
            case 'uso':
                typeClass = 'type-usage';
                typeText = 'Uso';
                break;
            case 'compra':
                typeClass = 'type-purchase';
                typeText = 'Compra';
                break;
            case 'transferencia':
                typeClass = 'type-transfer';
                typeText = 'Transferencia';
                break;
        }
        
        row.innerHTML = `
            <td>${formatDateTime(movement.date)}</td>
            <td><span class="type ${typeClass}">${typeText}</span></td>
            <td>${productsText}</td>
            <td>${movement.stage_name || '-'}</td>
            <td>${movement.substage_name || '-'}</td>
            <td>${movement.responsible}</td>
            <td>${movement.location}</td>
            <td>${formatCurrency(movement.cost)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editMovement(${movement.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMovement(${movement.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadMovementFilters() {
    try {
        // Load products for filter
        const productSelect = document.getElementById('filterProduct');
        productSelect.innerHTML = '<option value="">Todos los productos</option>';
        currentData.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            productSelect.appendChild(option);
        });
        
        // Load stages for filter
        const stageSelect = document.getElementById('filterStage');
        stageSelect.innerHTML = '<option value="">Todas las etapas</option>';
        currentData.stages.forEach(stage => {
            const option = document.createElement('option');
            option.value = stage.id;
            option.textContent = stage.name;
            stageSelect.appendChild(option);
        });
        
        // Load substages for filter
        const substageSelect = document.getElementById('filterSubstage');
        substageSelect.innerHTML = '<option value="">Todas las sub-etapas</option>';
        currentData.substages.forEach(substage => {
            const option = document.createElement('option');
            option.value = substage.id;
            option.textContent = `${substage.stage_name} > ${substage.name}`;
            substageSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading movement filters:', error);
    }
}

// Chart creation functions
function createConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createStockChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = data.map(item => item.name);
    const currentStock = data.map(item => item.current_stock);
    const minStock = data.map(item => item.min_stock);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Stock Actual',
                    data: currentStock,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Stock Mínimo',
                    data: minStock,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createLocationConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    // Flatten location data for chart
    const chartData = {};
    Object.keys(data).forEach(location => {
        Object.keys(data[location]).forEach(product => {
            const key = `${location} - ${product}`;
            chartData[key] = data[location][product];
        });
    });
    
    const labels = Object.keys(chartData);
    const values = Object.values(chartData);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createStageConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    // Flatten stage data for chart
    const chartData = {};
    Object.keys(data).forEach(stage => {
        Object.keys(data[stage]).forEach(product => {
            const key = `${stage} - ${product}`;
            chartData[key] = data[stage][product];
        });
    });
    
    const labels = Object.keys(chartData);
    const values = Object.values(chartData);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo',
                data: values,
                backgroundColor: 'rgba(153, 102, 255, 0.8)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createExpensesChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos ($)',
                data: values,
                backgroundColor: 'rgba(255, 159, 64, 0.8)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function createLocationExpensesChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createTimeChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = data.map(item => item.name);
    const expected = data.map(item => item.expected);
    const actual = data.map(item => item.actual);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiempo Esperado (días)',
                    data: expected,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Tiempo Real (días)',
                    data: actual,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createLocationTimeChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const expected = labels.map(location => data[location].expected);
    const actual = labels.map(location => data[location].actual);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiempo Esperado (días)',
                    data: expected,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Tiempo Real (días)',
                    data: actual,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    
    // Reset form if exists
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
    }
    
    // Clear dynamic content
    if (modalId === 'stageModal') {
        document.getElementById('substagesContainer').innerHTML = '';
    }
    if (modalId === 'movementModal') {
        document.getElementById('movementProductsContainer').innerHTML = '';
        document.getElementById('movementTotalCost').textContent = '0.00';
    }
}

// Product functions
function showProductForm(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (productId) {
        title.textContent = 'Editar Producto';
        const product = currentData.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('productName').value = product.name;
            document.getElementById('productUnit').value = product.unit;
            document.getElementById('productInitialStock').value = product.initial_stock;
            document.getElementById('productMinStock').value = product.min_stock;
            document.getElementById('productPrice').value = product.price;
        }
        form.dataset.editId = productId;
    } else {
        title.textContent = 'Nuevo Producto';
        form.removeAttribute('data-edit-id');
    }
    
    showModal('productModal');
}

async function editProduct(productId) {
    showProductForm(productId);
}

async function deleteProduct(productId) {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) {
        return;
    }
    
    try {
        await apiCall(`/api/productos/${productId}`, { method: 'DELETE' });
        showToast('Producto eliminado correctamente', 'success');
        await loadProducts();
    } catch (error) {
        showToast('Error al eliminar el producto', 'error');
    }
}

// Stage functions
function showStageForm(stageId = null) {
    const modal = document.getElementById('stageModal');
    const title = document.getElementById('stageModalTitle');
    const form = document.getElementById('stageForm');
    
    // Load locations
    const locationSelect = document.getElementById('stageLocation');
    locationSelect.innerHTML = '<option value="">Seleccionar locación</option>';
    currentData.locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = location.name;
        locationSelect.appendChild(option);
    });
    
    if (stageId) {
        title.textContent = 'Editar Etapa';
        const stage = currentData.stages.find(s => s.id === stageId);
        if (stage) {
            document.getElementById('stageName').value = stage.name;
            document.getElementById('stageLocation').value = stage.location_id;
            document.getElementById('stageExpectedDuration').value = stage.expected_duration;
            document.getElementById('stageDescription').value = stage.description;
        }
        form.dataset.editId = stageId;
    } else {
        title.textContent = 'Nueva Etapa';
        form.removeAttribute('data-edit-id');
    }
    
    showModal('stageModal');
}

function addSubstageField() {
    const container = document.getElementById('substagesContainer');
    const index = container.children.length;
    
    const substageDiv = document.createElement('div');
    substageDiv.className = 'substage-field';
    substageDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <input type="text" name="substages[${index}][name]" placeholder="Nombre de sub-etapa" required class="form-input">
            </div>
            <div class="form-group">
                <input type="number" name="substages[${index}][expected_duration]" placeholder="Duración (días)" required min="1" class="form-input">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeSubstageField(this)">🗑️</button>
            </div>
        </div>
        <div class="form-group">
            <textarea name="substages[${index}][description]" placeholder="Descripción (opcional)" class="form-textarea"></textarea>
        </div>
    `;
    
    container.appendChild(substageDiv);
}

function removeSubstageField(button) {
    button.closest('.substage-field').remove();
}

async function editStage(stageId) {
    showStageForm(stageId);
}

async function deleteStage(stageId) {
    if (!confirm('¿Está seguro de que desea eliminar esta etapa?')) {
        return;
    }
    
    try {
        await apiCall(`/api/etapas/${stageId}`, { method: 'DELETE' });
        showToast('Etapa eliminada correctamente', 'success');
        await loadStages();
    } catch (error) {
        showToast('Error al eliminar la etapa', 'error');
    }
}

async function startStage(stageId) {
    try {
        await apiCall(`/api/etapas/${stageId}/iniciar`, { method: 'POST' });
        showToast('Etapa iniciada correctamente', 'success');
        await loadStages();
    } catch (error) {
        showToast('Error al iniciar la etapa', 'error');
    }
}

async function finishStage(stageId) {
    try {
        await apiCall(`/api/etapas/${stageId}/finalizar`, { method: 'POST' });
        showToast('Etapa finalizada correctamente', 'success');
        await loadStages();
    } catch (error) {
        showToast('Error al finalizar la etapa', 'error');
    }
}

// Substage functions
function showSubstageForm(substageId = null) {
    const modal = document.getElementById('substageModal');
    const title = document.getElementById('substageModalTitle');
    const form = document.getElementById('substageForm');
    
    // Load stages
    const stageSelect = document.getElementById('substageStage');
    stageSelect.innerHTML = '<option value="">Seleccionar etapa</option>';
    currentData.stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage.id;
        option.textContent = stage.name;
        stageSelect.appendChild(option);
    });
    
    if (substageId) {
        title.textContent = 'Editar Sub-Etapa';
        const substage = currentData.substages.find(s => s.id === substageId);
        if (substage) {
            document.getElementById('substageName').value = substage.name;
            document.getElementById('substageStage').value = substage.stage_id;
            document.getElementById('substageExpectedDuration').value = substage.expected_duration;
            document.getElementById('substageDescription').value = substage.description;
        }
        form.dataset.editId = substageId;
    } else {
        title.textContent = 'Nueva Sub-Etapa';
        form.removeAttribute('data-edit-id');
    }
    
    showModal('substageModal');
}

async function editSubstage(substageId) {
    showSubstageForm(substageId);
}

async function deleteSubstage(substageId) {
    if (!confirm('¿Está seguro de que desea eliminar esta sub-etapa?')) {
        return;
    }
    
    try {
        await apiCall(`/api/sub-etapas/${substageId}`, { method: 'DELETE' });
        showToast('Sub-etapa eliminada correctamente', 'success');
        await loadSubstages();
    } catch (error) {
        showToast('Error al eliminar la sub-etapa', 'error');
    }
}

async function startSubstage(substageId) {
    try {
        await apiCall(`/api/sub-etapas/${substageId}/iniciar`, { method: 'POST' });
        showToast('Sub-etapa iniciada correctamente', 'success');
        await loadSubstages();
    } catch (error) {
        showToast('Error al iniciar la sub-etapa', 'error');
    }
}

async function finishSubstage(substageId) {
    try {
        await apiCall(`/api/sub-etapas/${substageId}/finalizar`, { method: 'POST' });
        showToast('Sub-etapa finalizada correctamente', 'success');
        await loadSubstages();
    } catch (error) {
        showToast('Error al finalizar la sub-etapa', 'error');
    }
}

// Location functions
function showLocationForm(locationId = null) {
    const modal = document.getElementById('locationModal');
    const title = document.getElementById('locationModalTitle');
    const form = document.getElementById('locationForm');
    
    if (locationId) {
        title.textContent = 'Editar Locación';
        const location = currentData.locations.find(l => l.id === locationId);
        if (location) {
            document.getElementById('locationName').value = location.name;
            document.getElementById('locationDescription').value = location.description;
        }
        form.dataset.editId = locationId;
    } else {
        title.textContent = 'Nueva Locación';
        form.removeAttribute('data-edit-id');
    }
    
    showModal('locationModal');
}

async function editLocation(locationId) {
    showLocationForm(locationId);
}

async function deleteLocation(locationId) {
    if (!confirm('¿Está seguro de que desea eliminar esta locación?')) {
        return;
    }
    
    try {
        await apiCall(`/api/locaciones/${locationId}`, { method: 'DELETE' });
        showToast('Locación eliminada correctamente', 'success');
        await loadLocations();
    } catch (error) {
        showToast('Error al eliminar la locación', 'error');
    }
}

// Movement functions
function showMovementForm(type, movementId = null) {
    const modal = document.getElementById('movementModal');
    const title = document.getElementById('movementModalTitle');
    const form = document.getElementById('movementForm');
    const typeSelect = document.getElementById('movementType');
    const stageFields = document.getElementById('movementStageFields');
    
    // Set current date
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('movementDate').value = now.toISOString().slice(0, 16);
    
    // Load locations
    const locationSelect = document.getElementById('movementLocation');
    locationSelect.innerHTML = '<option value="">Seleccionar locación</option>';
    currentData.locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = location.name;
        locationSelect.appendChild(option);
    });
    
    // Load stages
    const stageSelect = document.getElementById('movementStage');
    stageSelect.innerHTML = '<option value="">Seleccionar etapa</option>';
    currentData.stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage.id;
        option.textContent = stage.name;
        stageSelect.appendChild(option);
    });
    
    if (type) {
        typeSelect.value = type;
        
        // Show/hide stage fields based on type
        if (type === 'uso') {
            stageFields.style.display = 'flex';
            title.textContent = 'Registrar Uso';
        } else {
            stageFields.style.display = 'none';
            title.textContent = 'Registrar Compra';
        }
    }
    
    if (movementId) {
        title.textContent = 'Editar Movimiento';
        // Load movement data for editing
        form.dataset.editId = movementId;
    } else {
        form.removeAttribute('data-edit-id');
        // Add initial product field
        addMovementProduct();
    }
    
    showModal('movementModal');
}

function addMovementProduct() {
    const container = document.getElementById('movementProductsContainer');
    const index = container.children.length;
    
    const productDiv = document.createElement('div');
    productDiv.className = 'movement-product';
    productDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <select name="products[${index}][product_id]" required class="form-select product-select" onchange="updateProductInfo(this)">
                    <option value="">Seleccionar producto</option>
                    ${currentData.products.map(product => 
                        `<option value="${product.id}" data-price="${product.price}" data-unit="${product.unit}" data-stock="${product.current_stock}">
                            ${product.name} (Stock: ${product.current_stock} ${product.unit})
                        </option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <input type="number" name="products[${index}][quantity]" placeholder="Cantidad" required min="0.01" step="0.01" class="form-input quantity-input" onchange="updateMovementCost()">
            </div>
            <div class="form-group">
                <select name="products[${index}][unit]" required class="form-select">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="unidades">unidades</option>
                    <option value="%">%</option>
                    <option value="°C">°C</option>
                </select>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeMovementProduct(this)">🗑️</button>
            </div>
        </div>
        <div class="product-info">
            <small class="stock-info"></small>
        </div>
    `;
    
    container.appendChild(productDiv);
}

function removeMovementProduct(button) {
    button.closest('.movement-product').remove();
    updateMovementCost();
}

function updateProductInfo(select) {
    const option = select.selectedOptions[0];
    const productDiv = select.closest('.movement-product');
    const stockInfo = productDiv.querySelector('.stock-info');
    const unitSelect = productDiv.querySelector('select[name*="[unit]"]');
    
    if (option && option.value) {
        const stock = option.dataset.stock;
        const unit = option.dataset.unit;
        stockInfo.textContent = `Stock disponible: ${stock} ${unit}`;
        unitSelect.value = unit;
    } else {
        stockInfo.textContent = '';
    }
    
    updateMovementCost();
}

function updateMovementCost() {
    let totalCost = 0;
    
    document.querySelectorAll('.movement-product').forEach(productDiv => {
        const select = productDiv.querySelector('.product-select');
        const quantityInput = productDiv.querySelector('.quantity-input');
        
        if (select.value && quantityInput.value) {
            const option = select.selectedOptions[0];
            const price = parseFloat(option.dataset.price || 0);
            const quantity = parseFloat(quantityInput.value || 0);
            totalCost += price * quantity;
        }
    });
    
    document.getElementById('movementTotalCost').textContent = totalCost.toFixed(2);
}

// Update substages when stage changes
document.getElementById('movementStage').addEventListener('change', function() {
    const stageId = parseInt(this.value);
    const substageSelect = document.getElementById('movementSubstage');
    
    substageSelect.innerHTML = '<option value="">Seleccionar sub-etapa</option>';
    
    if (stageId) {
        const stageSubstages = currentData.substages.filter(s => s.stage_id === stageId);
        stageSubstages.forEach(substage => {
            const option = document.createElement('option');
            option.value = substage.id;
            option.textContent = substage.name;
            substageSelect.appendChild(option);
        });
    }
});

// Transfer functions
function showTransferForm() {
    const modal = document.getElementById('transferModal');
    
    // Load products
    const productSelect = document.getElementById('transferProduct');
    productSelect.innerHTML = '<option value="">Seleccionar producto</option>';
    currentData.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (Stock: ${product.current_stock} ${product.unit})`;
        option.dataset.stock = product.current_stock;
        option.dataset.unit = product.unit;
        productSelect.appendChild(option);
    });
    
    // Load locations
    const fromLocationSelect = document.getElementById('transferFromLocation');
    const toLocationSelect = document.getElementById('transferToLocation');
    
    [fromLocationSelect, toLocationSelect].forEach(select => {
        select.innerHTML = '<option value="">Seleccionar locación</option>';
        currentData.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.name;
            option.textContent = location.name;
            select.appendChild(option);
        });
    });
    
    showModal('transferModal');
}

// Update transfer product info
document.getElementById('transferProduct').addEventListener('change', function() {
    const option = this.selectedOptions[0];
    const stockInfo = document.getElementById('transferAvailableStock');
    const unitSelect = document.getElementById('transferUnit');
    
    if (option && option.value) {
        const stock = option.dataset.stock;
        const unit = option.dataset.unit;
        stockInfo.textContent = `Stock disponible: ${stock} ${unit}`;
        unitSelect.value = unit;
    } else {
        stockInfo.textContent = '';
    }
});

async function editMovement(movementId) {
    // Implementation for editing movements
    showToast('Función de edición en desarrollo', 'info');
}

async function deleteMovement(movementId) {
    if (!confirm('¿Está seguro de que desea eliminar este movimiento?')) {
        return;
    }
    
    try {
        await apiCall(`/api/movimientos/${movementId}`, { method: 'DELETE' });
        showToast('Movimiento eliminado correctamente', 'success');
        await loadMovements();
        await loadDashboard(); // Refresh dashboard data
    } catch (error) {
        showToast('Error al eliminar el movimiento', 'error');
    }
}

// Filter functions
function applyFilters() {
    // Implementation for filtering movements
    showToast('Filtros aplicados', 'info');
}

function clearFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterProduct').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStage').value = '';
    document.getElementById('filterSubstage').value = '';
    
    showToast('Filtros limpiados', 'info');
}

// Export function
async function exportToExcel() {
    try {
        const response = await fetch('/api/exportar-excel');
        if (!response.ok) {
            throw new Error('Error al generar el archivo Excel');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `inventario_cultivo_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Archivo Excel descargado correctamente', 'success');
    } catch (error) {
        showToast('Error al exportar a Excel', 'error');
    }
}

// Form submission handlers
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const editId = this.dataset.editId;
    
    try {
        if (editId) {
            await apiCall(`/api/productos/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Producto actualizado correctamente', 'success');
        } else {
            await apiCall('/api/productos', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Producto creado correctamente', 'success');
        }
        
        closeModal('productModal');
        await loadProducts();
        await loadDashboard();
    } catch (error) {
        showToast('Error al guardar el producto', 'error');
    }
});

document.getElementById('stageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const editId = this.dataset.editId;
    
    // Collect substages
    const substages = [];
    document.querySelectorAll('.substage-field').forEach((field, index) => {
        const name = field.querySelector(`input[name="substages[${index}][name]"]`).value;
        const duration = field.querySelector(`input[name="substages[${index}][expected_duration]"]`).value;
        const description = field.querySelector(`textarea[name="substages[${index}][description]"]`).value;
        
        if (name && duration) {
            substages.push({
                name: name,
                expected_duration: parseInt(duration),
                description: description
            });
        }
    });
    
    data.substages = substages;
    
    try {
        if (editId) {
            await apiCall(`/api/etapas/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Etapa actualizada correctamente', 'success');
        } else {
            await apiCall('/api/etapas', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Etapa creada correctamente', 'success');
        }
        
        closeModal('stageModal');
        await loadStages();
        await loadSubstages();
        await loadDashboard();
    } catch (error) {
        showToast('Error al guardar la etapa', 'error');
    }
});

document.getElementById('substageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const editId = this.dataset.editId;
    
    try {
        if (editId) {
            await apiCall(`/api/sub-etapas/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Sub-etapa actualizada correctamente', 'success');
        } else {
            await apiCall('/api/sub-etapas', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Sub-etapa creada correctamente', 'success');
        }
        
        closeModal('substageModal');
        await loadSubstages();
        await loadDashboard();
    } catch (error) {
        showToast('Error al guardar la sub-etapa', 'error');
    }
});

document.getElementById('locationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const editId = this.dataset.editId;
    
    try {
        if (editId) {
            await apiCall(`/api/locaciones/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Locación actualizada correctamente', 'success');
        } else {
            await apiCall('/api/locaciones', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Locación creada correctamente', 'success');
        }
        
        closeModal('locationModal');
        await loadLocations();
        await loadDashboard();
    } catch (error) {
        showToast('Error al guardar la locación', 'error');
    }
});

document.getElementById('movementForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const editId = this.dataset.editId;
    
    // Collect products
    const products = [];
    document.querySelectorAll('.movement-product').forEach((productDiv, index) => {
        const productId = productDiv.querySelector(`select[name="products[${index}][product_id]"]`).value;
        const quantity = productDiv.querySelector(`input[name="products[${index}][quantity]"]`).value;
        const unit = productDiv.querySelector(`select[name="products[${index}][unit]"]`).value;
        
        if (productId && quantity && unit) {
            products.push({
                product_id: parseInt(productId),
                quantity: parseFloat(quantity),
                unit: unit
            });
        }
    });
    
    data.products = products;
    
    // Convert stage_id and substage_id to integers if they exist
    if (data.stage_id) data.stage_id = parseInt(data.stage_id);
    if (data.substage_id) data.substage_id = parseInt(data.substage_id);
    
    try {
        if (editId) {
            await apiCall(`/api/movimientos/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Movimiento actualizado correctamente', 'success');
        } else {
            await apiCall('/api/movimientos', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Movimiento registrado correctamente', 'success');
        }
        
        closeModal('movementModal');
        await loadMovements();
        await loadProducts(); // Refresh to update stock
        await loadDashboard();
    } catch (error) {
        showToast('Error al guardar el movimiento', 'error');
    }
});

document.getElementById('transferForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Convert product_id to integer
    data.product_id = parseInt(data.product_id);
    data.quantity = parseFloat(data.quantity);
    
    try {
        await apiCall('/api/transferencias', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showToast('Transferencia realizada correctamente', 'success');
        
        closeModal('transferModal');
        await loadMovements();
        await loadProducts();
        await loadDashboard();
    } catch (error) {
        showToast('Error al realizar la transferencia', 'error');
    }
});

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Navigation event listeners
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            showSection(section);
        });
    });
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    
    // Modal close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Movement type change handler
    document.getElementById('movementType').addEventListener('change', function() {
        const stageFields = document.getElementById('movementStageFields');
        if (this.value === 'uso') {
            stageFields.style.display = 'flex';
        } else {
            stageFields.style.display = 'none';
        }
    });
    
    // Load initial data
    loadDashboard();
    loadProducts();
    loadStages();
    loadSubstages();
    loadLocations();
    loadMovements();
});

