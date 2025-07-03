// API Configuration
const API_BASE_URL = '';

// Global variables
let currentEditingId = null;
let currentEditingType = null;
let products = [];
let locations = [];
let stages = [];
let substages = [];
let movements = [];
let postits = [];
let recipes = [];
let recipeImages = [];

// Tab order management
let tabOrder = ['dashboard', 'productos', 'etapas', 'sub-etapas', 'locaciones', 'movimientos', 'postits', 'recetas'];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load tab order from localStorage
        loadTabOrder();
        
        // Initialize drag and drop for tabs
        initializeDragAndDrop();
        
        // Load initial data
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Show dashboard by default
        showSection('dashboard');
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Error al inicializar la aplicación', 'error');
    }
}

// Tab order management
function loadTabOrder() {
    const savedOrder = localStorage.getItem('tabOrder');
    if (savedOrder) {
        tabOrder = JSON.parse(savedOrder);
        reorderTabs();
    }
}

function saveTabOrder() {
    localStorage.setItem('tabOrder', JSON.stringify(tabOrder));
}

function reorderTabs() {
    const navigation = document.getElementById('navigation');
    const buttons = Array.from(navigation.children);
    
    // Clear navigation
    navigation.innerHTML = '';
    
    // Add buttons in saved order
    tabOrder.forEach(sectionId => {
        const button = buttons.find(btn => btn.dataset.section === sectionId);
        if (button) {
            navigation.appendChild(button);
        }
    });
}

function initializeDragAndDrop() {
    const navigation = document.getElementById('navigation');
    
    new Sortable(navigation, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function(evt) {
            // Update tab order
            const buttons = Array.from(navigation.children);
            tabOrder = buttons.map(btn => btn.dataset.section);
            saveTabOrder();
        }
    });
}

// Data loading functions
async function loadAllData() {
    await Promise.all([
        loadProducts(),
        loadLocations(),
        loadStages(),
        loadSubstages(),
        loadMovements(),
        loadPostits(),
        loadRecipes(),
        loadRecipeImages(),
        loadDashboardData()
    ]);
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos`);
        products = await response.json();
        renderProductsTable();
        updateProductSelects();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/locaciones`);
        locations = await response.json();
        renderLocationsTable();
        updateLocationSelects();
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function loadStages() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/etapas`);
        stages = await response.json();
        renderStagesTable();
        updateStageSelects();
    } catch (error) {
        console.error('Error loading stages:', error);
    }
}

async function loadSubstages() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sub-etapas`);
        substages = await response.json();
        renderSubstagesTable();
        updateSubstageSelects();
    } catch (error) {
        console.error('Error loading substages:', error);
    }
}

async function loadMovements() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/movimientos`);
        movements = await response.json();
        renderMovementsTable();
        updateLocationFilter();
    } catch (error) {
        console.error('Error loading movements:', error);
    }
}

async function loadPostits() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/postits`);
        postits = await response.json();
        renderPostitsGrid();
    } catch (error) {
        console.error('Error loading post-its:', error);
    }
}

async function loadRecipes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas`);
        recipes = await response.json();
        renderRecipesList();
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
}

async function loadRecipeImages() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/imagenes`);
        recipeImages = await response.json();
        renderImagesGallery();
    } catch (error) {
        console.error('Error loading recipe images:', error);
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`);
        const data = await response.json();
        updateDashboard(data);
        await loadAllCharts();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Event listeners setup
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Product management
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('productHasStock').addEventListener('change', toggleStockFields);

    // Stage management
    document.getElementById('addStageBtn').addEventListener('click', () => openStageModal());
    document.getElementById('stageForm').addEventListener('submit', handleStageSubmit);

    // Substage management
    document.getElementById('addSubstageBtn').addEventListener('click', () => openSubstageModal());
    document.getElementById('substageForm').addEventListener('submit', handleSubstageSubmit);

    // Location management
    document.getElementById('addLocationBtn').addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm').addEventListener('submit', handleLocationSubmit);

    // Movement management
    document.getElementById('addMovementBtn').addEventListener('click', () => openMovementModal('uso'));
    document.getElementById('addPurchaseBtn').addEventListener('click', () => openMovementModal('compra'));
    document.getElementById('addTransferBtn').addEventListener('click', () => openTransferModal());
    document.getElementById('movementForm').addEventListener('submit', handleMovementSubmit);
    document.getElementById('transferForm').addEventListener('submit', handleTransferSubmit);

    // Post-it management
    document.getElementById('addPostitBtn').addEventListener('click', () => openPostitModal());
    document.getElementById('postitForm').addEventListener('submit', handlePostitSubmit);

    // Recipe management
    document.getElementById('uploadFileBtn').addEventListener('click', () => openModal('uploadFileModal'));
    document.getElementById('uploadImageBtn').addEventListener('click', () => openModal('uploadImageModal'));
    document.getElementById('uploadFileForm').addEventListener('submit', handleFileUpload);
    document.getElementById('uploadImageForm').addEventListener('submit', handleImageUpload);

    // Product row management
    document.getElementById('addProductRow').addEventListener('click', addProductRow);

    // Filters
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('locationFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);

    // Stage dropdown change
    document.getElementById('movementStage').addEventListener('change', updateSubstageOptions);

    // Product selection change
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('product-select')) {
            updateUnitDisplay(e.target);
        }
    });

    // Transfer product change
    document.getElementById('transferProduct').addEventListener('change', updateTransferUnit);
}

// Navigation functions
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

    // Add active class to corresponding nav button
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Load section-specific charts
    loadSectionCharts(sectionId);
}

async function loadSectionCharts(sectionId) {
    switch (sectionId) {
        case 'productos':
            await loadProductCharts();
            break;
        case 'etapas':
            await loadStageCharts();
            break;
        case 'sub-etapas':
            await loadSubstageCharts();
            break;
        case 'locaciones':
            await loadLocationCharts();
            break;
    }
}

// Dashboard functions
function updateDashboard(data) {
    document.getElementById('totalProducts').textContent = data.total_products;
    document.getElementById('totalStages').textContent = data.total_stages;
    document.getElementById('totalLocations').textContent = data.total_locations;
    document.getElementById('totalCost').textContent = `$${data.total_cost.toFixed(2)}`;

    renderStockAlerts(data.low_stock_alerts);
}

function renderStockAlerts(alerts) {
    const container = document.getElementById('stockAlerts');
    container.innerHTML = '';

    if (alerts.length === 0) {
        return;
    }

    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alert.status === 'crítico' ? 'alert-danger' : 'alert-warning'}`;
        alertDiv.innerHTML = `
            <strong>⚠️ Stock ${alert.status}:</strong> 
            ${alert.product_name} - Actual: ${alert.current_stock} ${alert.unit}, 
            Mínimo: ${alert.min_stock} ${alert.unit}
        `;
        container.appendChild(alertDiv);
    });
}

// Product functions
function openProductModal(product = null) {
    currentEditingId = product ? product.id : null;
    currentEditingType = 'product';
    
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    title.textContent = product ? 'Editar Producto' : 'Agregar Producto';
    
    if (product) {
        document.getElementById('productName').value = product.name;
        document.getElementById('productUnit').value = product.unit;
        document.getElementById('productHasStock').checked = product.has_stock !== false;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productResponsible').value = product.responsible || '';
        
        if (product.has_stock !== false) {
            document.getElementById('productInitialStock').value = product.initial_stock;
            document.getElementById('productCurrentStock').value = product.current_stock;
            document.getElementById('productMinStock').value = product.min_stock;
        } else {
            document.getElementById('productCurrentValue').value = product.current_stock;
        }
    } else {
        form.reset();
        document.getElementById('productHasStock').checked = true;
    }
    
    toggleStockFields();
    openModal('productModal');
}

function toggleStockFields() {
    const hasStock = document.getElementById('productHasStock').checked;
    const stockFields = document.getElementById('stockFields');
    const valueField = document.getElementById('valueField');
    
    if (hasStock) {
        stockFields.style.display = 'block';
        valueField.style.display = 'none';
    } else {
        stockFields.style.display = 'none';
        valueField.style.display = 'block';
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const hasStock = formData.get('has_stock') === 'on';
    
    const data = {
        name: formData.get('name'),
        unit: formData.get('unit'),
        price: parseFloat(formData.get('price')),
        responsible: formData.get('responsible'),
        has_stock: hasStock
    };
    
    if (hasStock) {
        data.initial_stock = parseFloat(formData.get('initial_stock')) || 0;
        data.current_stock = parseFloat(formData.get('current_stock')) || 0;
        data.min_stock = parseFloat(formData.get('min_stock')) || 0;
    } else {
        data.current_value = parseFloat(formData.get('current_value')) || 0;
    }
    
    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/api/productos/${currentEditingId}` : 
            `${API_BASE_URL}/api/productos`;
        
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadProducts();
            closeModal('productModal');
            showNotification(currentEditingId ? 'Producto actualizado' : 'Producto creado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar producto', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error al guardar producto', 'error');
    }
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadProducts();
            showNotification('Producto eliminado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar producto', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error al eliminar producto', 'error');
    }
}

// Stage functions
function openStageModal(stage = null) {
    currentEditingId = stage ? stage.id : null;
    currentEditingType = 'stage';
    
    const modal = document.getElementById('stageModal');
    const title = document.getElementById('stageModalTitle');
    const form = document.getElementById('stageForm');
    
    title.textContent = stage ? 'Editar Etapa' : 'Agregar Etapa';
    
    if (stage) {
        document.getElementById('stageName').value = stage.name;
        document.getElementById('stageDescription').value = stage.description || '';
        document.getElementById('stageLocation').value = stage.location_id || '';
        document.getElementById('stageExpectedDuration').value = stage.expected_duration;
        document.getElementById('stageResponsible').value = stage.responsible || '';
    } else {
        form.reset();
    }
    
    openModal('stageModal');
}

async function handleStageSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        location_id: formData.get('location_id') ? parseInt(formData.get('location_id')) : null,
        expected_duration: parseInt(formData.get('expected_duration')),
        responsible: formData.get('responsible')
    };
    
    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/api/etapas/${currentEditingId}` : 
            `${API_BASE_URL}/api/etapas`;
        
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadStages();
            closeModal('stageModal');
            showNotification(currentEditingId ? 'Etapa actualizada' : 'Etapa creada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar etapa', 'error');
        }
    } catch (error) {
        console.error('Error saving stage:', error);
        showNotification('Error al guardar etapa', 'error');
    }
}

function editStage(id) {
    const stage = stages.find(s => s.id === id);
    if (stage) {
        openStageModal(stage);
    }
}

async function deleteStage(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta etapa?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/etapas/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadStages();
            showNotification('Etapa eliminada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar etapa', 'error');
        }
    } catch (error) {
        console.error('Error deleting stage:', error);
        showNotification('Error al eliminar etapa', 'error');
    }
}

async function startStage(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/etapas/${id}/iniciar`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadStages();
            showNotification('Etapa iniciada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al iniciar etapa', 'error');
        }
    } catch (error) {
        console.error('Error starting stage:', error);
        showNotification('Error al iniciar etapa', 'error');
    }
}

async function finishStage(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/etapas/${id}/finalizar`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadStages();
            showNotification('Etapa finalizada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al finalizar etapa', 'error');
        }
    } catch (error) {
        console.error('Error finishing stage:', error);
        showNotification('Error al finalizar etapa', 'error');
    }
}

// Substage functions
function openSubstageModal(substage = null) {
    currentEditingId = substage ? substage.id : null;
    currentEditingType = 'substage';
    
    const modal = document.getElementById('substageModal');
    const title = document.getElementById('substageModalTitle');
    const form = document.getElementById('substageForm');
    
    title.textContent = substage ? 'Editar Sub-Etapa' : 'Agregar Sub-Etapa';
    
    if (substage) {
        document.getElementById('substageName').value = substage.name;
        document.getElementById('substageDescription').value = substage.description || '';
        document.getElementById('substageStage').value = substage.stage_id || '';
        document.getElementById('substageExpectedDuration').value = substage.expected_duration;
        document.getElementById('substageResponsible').value = substage.responsible || '';
    } else {
        form.reset();
    }
    
    openModal('substageModal');
}

async function handleSubstageSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        stage_id: parseInt(formData.get('stage_id')),
        expected_duration: parseInt(formData.get('expected_duration')),
        responsible: formData.get('responsible')
    };
    
    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/api/sub-etapas/${currentEditingId}` : 
            `${API_BASE_URL}/api/sub-etapas`;
        
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadSubstages();
            closeModal('substageModal');
            showNotification(currentEditingId ? 'Sub-etapa actualizada' : 'Sub-etapa creada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar sub-etapa', 'error');
        }
    } catch (error) {
        console.error('Error saving substage:', error);
        showNotification('Error al guardar sub-etapa', 'error');
    }
}

function editSubstage(id) {
    const substage = substages.find(s => s.id === id);
    if (substage) {
        openSubstageModal(substage);
    }
}

async function deleteSubstage(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sub-etapa?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/sub-etapas/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadSubstages();
            showNotification('Sub-etapa eliminada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar sub-etapa', 'error');
        }
    } catch (error) {
        console.error('Error deleting substage:', error);
        showNotification('Error al eliminar sub-etapa', 'error');
    }
}

async function startSubstage(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sub-etapas/${id}/iniciar`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadSubstages();
            showNotification('Sub-etapa iniciada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al iniciar sub-etapa', 'error');
        }
    } catch (error) {
        console.error('Error starting substage:', error);
        showNotification('Error al iniciar sub-etapa', 'error');
    }
}

async function finishSubstage(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sub-etapas/${id}/finalizar`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadSubstages();
            showNotification('Sub-etapa finalizada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al finalizar sub-etapa', 'error');
        }
    } catch (error) {
        console.error('Error finishing substage:', error);
        showNotification('Error al finalizar sub-etapa', 'error');
    }
}

// Location functions
function openLocationModal(location = null) {
    currentEditingId = location ? location.id : null;
    currentEditingType = 'location';
    
    const modal = document.getElementById('locationModal');
    const title = document.getElementById('locationModalTitle');
    const form = document.getElementById('locationForm');
    
    title.textContent = location ? 'Editar Locación' : 'Agregar Locación';
    
    if (location) {
        document.getElementById('locationName').value = location.name;
        document.getElementById('locationDescription').value = location.description || '';
        document.getElementById('locationResponsible').value = location.responsible || '';
    } else {
        form.reset();
    }
    
    openModal('locationModal');
}

async function handleLocationSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        responsible: formData.get('responsible')
    };
    
    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/api/locaciones/${currentEditingId}` : 
            `${API_BASE_URL}/api/locaciones`;
        
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadLocations();
            closeModal('locationModal');
            showNotification(currentEditingId ? 'Locación actualizada' : 'Locación creada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar locación', 'error');
        }
    } catch (error) {
        console.error('Error saving location:', error);
        showNotification('Error al guardar locación', 'error');
    }
}

function editLocation(id) {
    const location = locations.find(l => l.id === id);
    if (location) {
        openLocationModal(location);
    }
}

async function deleteLocation(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta locación?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/locaciones/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadLocations();
            showNotification('Locación eliminada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar locación', 'error');
        }
    } catch (error) {
        console.error('Error deleting location:', error);
        showNotification('Error al eliminar locación', 'error');
    }
}

// Movement functions
function openMovementModal(type) {
    currentEditingId = null;
    currentEditingType = 'movement';
    
    const modal = document.getElementById('movementModal');
    const title = document.getElementById('movementModalTitle');
    const form = document.getElementById('movementForm');
    
    document.getElementById('movementType').value = type;
    
    switch (type) {
        case 'uso':
            title.textContent = 'Registrar Uso';
            break;
        case 'compra':
            title.textContent = 'Registrar Compra';
            break;
        default:
            title.textContent = 'Registrar Movimiento';
    }
    
    form.reset();
    document.getElementById('movementType').value = type;
    
    // Reset products container
    const container = document.getElementById('productsContainer');
    container.innerHTML = `
        <div class="product-row">
            <select class="product-select" name="product_id" required>
                <option value="">Seleccionar producto</option>
            </select>
            <input type="number" class="quantity-input" name="quantity" placeholder="Cantidad" step="0.01" min="0.01" required>
            <span class="unit-display"></span>
            <button type="button" class="btn btn-danger btn-sm remove-product">Eliminar</button>
        </div>
    `;
    
    updateProductSelects();
    openModal('movementModal');
}

function openTransferModal() {
    currentEditingId = null;
    currentEditingType = 'transfer';
    
    const modal = document.getElementById('transferModal');
    const form = document.getElementById('transferForm');
    
    form.reset();
    openModal('transferModal');
}

async function handleMovementSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productRows = document.querySelectorAll('#productsContainer .product-row');
    
    const products = [];
    productRows.forEach(row => {
        const productId = row.querySelector('.product-select').value;
        const quantity = row.querySelector('.quantity-input').value;
        
        if (productId && quantity) {
            products.push({
                product_id: parseInt(productId),
                quantity: parseFloat(quantity)
            });
        }
    });
    
    if (products.length === 0) {
        showNotification('Debe agregar al menos un producto', 'error');
        return;
    }
    
    const data = {
        type: formData.get('type'),
        products: products,
        stage_id: formData.get('stage_id') ? parseInt(formData.get('stage_id')) : null,
        substage_id: formData.get('substage_id') ? parseInt(formData.get('substage_id')) : null,
        responsible: formData.get('responsible'),
        location_id: formData.get('location_id') ? parseInt(formData.get('location_id')) : null,
        observations: formData.get('observations')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movimientos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadMovements();
            await loadProducts(); // Reload to update stock
            closeModal('movementModal');
            showNotification('Movimiento registrado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al registrar movimiento', 'error');
        }
    } catch (error) {
        console.error('Error saving movement:', error);
        showNotification('Error al registrar movimiento', 'error');
    }
}

async function handleTransferSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Obtener nombres de locaciones para construir el texto de transferencia
    const fromLocationId = formData.get('from_location_id');
    const toLocationId = formData.get('to_location_id');
    
    let locationText = '';
    if (fromLocationId && toLocationId) {
        const fromLocation = locations.find(l => l.id == fromLocationId);
        const toLocation = locations.find(l => l.id == toLocationId);
        if (fromLocation && toLocation) {
            locationText = `${fromLocation.name} → ${toLocation.name}`;
        }
    }
    
    const data = {
        type: 'transferencia',
        products: [{
            product_id: parseInt(formData.get('product_id')),
            quantity: parseFloat(formData.get('quantity'))
        }],
        responsible: formData.get('responsible'),
        location_id: toLocationId ? parseInt(toLocationId) : null, // Usar locación destino como principal
        observations: formData.get('observations')
    };
    
    // Si tenemos ambas locaciones, agregar información adicional
    if (locationText) {
        data.observations = (data.observations || '') + `\nTransferencia: ${locationText}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movimientos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadMovements();
            await loadProducts(); // Reload to update stock
            closeModal('transferModal');
            showNotification('Transferencia registrada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al registrar transferencia', 'error');
        }
    } catch (error) {
        console.error('Error saving transfer:', error);
        showNotification('Error al registrar transferencia', 'error');
    }
}

async function editMovement(id) {
    try {
        // Buscar el movimiento en la lista actual
        const movement = movements.find(m => m.id === id);
        if (!movement) {
            showNotification('Movimiento no encontrado', 'error');
            return;
        }
        
        // Abrir modal de edición
        const modal = document.getElementById('editMovementModal');
        if (!modal) {
            showNotification('Modal de edición no encontrado', 'error');
            return;
        }
        
        // Llenar formulario con datos existentes
        document.getElementById('editMovementId').value = movement.id;
        document.getElementById('editMovementStage').value = movement.stage_id || '';
        document.getElementById('editMovementSubstage').value = movement.substage_id || '';
        document.getElementById('editMovementLocation').value = movement.location_id || '';
        document.getElementById('editMovementResponsible').value = movement.responsible || '';
        document.getElementById('editMovementObservations').value = movement.observations || '';
        
        // Actualizar dropdowns de sub-etapas si hay etapa seleccionada
        if (movement.stage_id) {
            updateSubstageOptions('editMovementSubstage', movement.stage_id);
        }
        
        // Mostrar modal
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error al editar movimiento:', error);
        showNotification('Error al cargar datos del movimiento', 'error');
    }
}

async function deleteMovement(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movimientos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadMovements();
            showNotification('Movimiento eliminado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar movimiento', 'error');
        }
    } catch (error) {
        console.error('Error deleting movement:', error);
        showNotification('Error al eliminar movimiento', 'error');
    }
}

async function handleEditMovementSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const movementId = formData.get('movement_id');
    
    // Validar campos obligatorios
    if (!formData.get('responsible')) {
        showNotification('Responsable es obligatorio', 'error');
        return;
    }
    
    const data = {
        stage_id: formData.get('stage_id') ? parseInt(formData.get('stage_id')) : null,
        substage_id: formData.get('substage_id') ? parseInt(formData.get('substage_id')) : null,
        location_id: formData.get('location_id') ? parseInt(formData.get('location_id')) : null,
        responsible: formData.get('responsible'),
        observations: formData.get('observations')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movimientos/${movementId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadMovements();
            closeModal('editMovementModal');
            showNotification('Movimiento actualizado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al actualizar movimiento', 'error');
        }
    } catch (error) {
        console.error('Error updating movement:', error);
        showNotification('Error al actualizar movimiento', 'error');
    }
}

// Table rendering functions
function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('tr');
        
        let statusClass = 'status-normal';
        let statusText = 'Normal';
        
        if (product.has_stock !== false) {
            if (product.current_stock === 0) {
                statusClass = 'status-critical';
                statusText = 'Crítico';
            } else if (product.current_stock <= product.min_stock) {
                statusClass = 'status-low';
                statusText = 'Bajo';
            }
        } else {
            statusClass = 'status-info';
            statusText = 'Variable';
        }

        const stockDisplay = product.has_stock !== false ? 
            product.current_stock : 
            `${product.current_stock} (valor actual)`;

        const minStockDisplay = product.has_stock !== false ? 
            product.min_stock : 
            'N/A';

        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.unit}</td>
            <td>${stockDisplay}</td>
            <td>${minStockDisplay}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.responsible || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderStagesTable() {
    const tbody = document.querySelector('#stagesTable tbody');
    tbody.innerHTML = '';

    stages.forEach(stage => {
        const row = document.createElement('tr');
        
        let statusClass = 'status-pending';
        let statusText = 'Pendiente';
        let progress = 0;
        let actionButtons = `<button class="btn btn-sm btn-success" onclick="startStage(${stage.id})">Iniciar</button>`;
        
        if (stage.status === 'in_progress') {
            statusClass = 'status-in-progress';
            statusText = 'En Progreso';
            
            if (stage.start_time) {
                const startDate = new Date(stage.start_time);
                const now = new Date();
                const elapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
                progress = Math.min((elapsed / stage.expected_duration) * 100, 100);
            }
            
            actionButtons = `<button class="btn btn-sm btn-warning" onclick="finishStage(${stage.id})">Finalizar</button>`;
        } else if (stage.status === 'completed') {
            statusClass = 'status-completed';
            statusText = 'Completada';
            progress = 100;
            actionButtons = '<span class="text-success">✓ Completada</span>';
        }

        const actualDuration = stage.actual_duration || (stage.status === 'in_progress' && stage.start_time ? 
            Math.floor((new Date() - new Date(stage.start_time)) / (1000 * 60 * 60 * 24)) : 0);

        row.innerHTML = `
            <td>${stage.name}</td>
            <td>${stage.expected_duration} días</td>
            <td>${actualDuration} días</td>
            <td>${stage.location_name || 'N/A'}</td>
            <td>${stage.responsible || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <small>${progress.toFixed(0)}%</small>
            </td>
            <td>
                ${actionButtons}
                <button class="btn btn-sm btn-primary" onclick="editStage(${stage.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStage(${stage.id})">Eliminar</button>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="generateStageReport(${stage.id})" title="Generar resumen de etapa">📊 Resumen</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderSubstagesTable() {
    const tbody = document.querySelector('#substagesTable tbody');
    tbody.innerHTML = '';

    substages.forEach(substage => {
        const row = document.createElement('tr');
        
        let statusClass = 'status-pending';
        let statusText = 'Pendiente';
        let progress = 0;
        let actionButtons = `<button class="btn btn-sm btn-success" onclick="startSubstage(${substage.id})">Iniciar</button>`;
        
        if (substage.status === 'in_progress') {
            statusClass = 'status-in-progress';
            statusText = 'En Progreso';
            
            if (substage.start_time) {
                const startDate = new Date(substage.start_time);
                const now = new Date();
                const elapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
                progress = Math.min((elapsed / substage.expected_duration) * 100, 100);
            }
            
            actionButtons = `<button class="btn btn-sm btn-warning" onclick="finishSubstage(${substage.id})">Finalizar</button>`;
        } else if (substage.status === 'completed') {
            statusClass = 'status-completed';
            statusText = 'Completada';
            progress = 100;
            actionButtons = '<span class="text-success">✓ Completada</span>';
        }

        const actualDuration = substage.actual_duration || (substage.status === 'in_progress' && substage.start_time ? 
            Math.floor((new Date() - new Date(substage.start_time)) / (1000 * 60 * 60 * 24)) : 0);

        row.innerHTML = `
            <td>${substage.name}</td>
            <td>${substage.stage_name || 'N/A'}</td>
            <td>${substage.expected_duration} días</td>
            <td>${actualDuration} días</td>
            <td>${substage.responsible || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <small>${progress.toFixed(0)}%</small>
            </td>
            <td>
                ${actionButtons}
                <button class="btn btn-sm btn-primary" onclick="editSubstage(${substage.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSubstage(${substage.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderLocationsTable() {
    const tbody = document.querySelector('#locationsTable tbody');
    tbody.innerHTML = '';

    locations.forEach(location => {
        const row = document.createElement('tr');
        const createdDate = new Date(location.created_at).toLocaleDateString();
        
        row.innerHTML = `
            <td>${location.name}</td>
            <td>${location.description || 'N/A'}</td>
            <td>${location.responsible || 'N/A'}</td>
            <td>${createdDate}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editLocation(${location.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderMovementsTable() {
    const tbody = document.querySelector('#movementsTable tbody');
    tbody.innerHTML = '';

    let filteredMovements = movements;
    
    // Apply filters
    const typeFilter = document.getElementById('typeFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    if (typeFilter) {
        filteredMovements = filteredMovements.filter(m => m.type === typeFilter);
    }
    
    if (locationFilter) {
        filteredMovements = filteredMovements.filter(m => m.location.includes(locationFilter));
    }
    
    if (dateFilter) {
        filteredMovements = filteredMovements.filter(m => m.date.startsWith(dateFilter));
    }

    filteredMovements.forEach(movement => {
        const row = document.createElement('tr');
        const date = new Date(movement.date).toLocaleString();
        
        const productsText = movement.products.map(p => 
            `${p.product_name || 'Desconocido'}: ${p.quantity} ${p.unit}`
        ).join(', ');
        
        let typeClass = 'status-normal';
        if (movement.type === 'compra') typeClass = 'status-completed';
        if (movement.type === 'transferencia') typeClass = 'status-in-progress';

        row.innerHTML = `
            <td>${date}</td>
            <td><span class="status-badge ${typeClass}">${movement.type.toUpperCase()}</span></td>
            <td>${productsText}</td>
            <td>${movement.stage_name || 'N/A'}</td>
            <td>${movement.substage_name || 'N/A'}</td>
            <td>${movement.responsible}</td>
            <td>${movement.location}</td>
            <td>$${movement.cost.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editMovement(${movement.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMovement(${movement.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Post-it functions (keeping existing implementation)
function renderPostitsGrid() {
    const grid = document.getElementById('postitsGrid');
    grid.innerHTML = '';

    postits.forEach(postit => {
        const postitDiv = document.createElement('div');
        postitDiv.className = 'postit fade-in';
        postitDiv.style.backgroundColor = postit.color;
        
        const createdDate = new Date(postit.created_at).toLocaleDateString();
        
        postitDiv.innerHTML = `
            <div class="postit-header">
                <div class="postit-title">${postit.title}</div>
                <div class="postit-actions">
                    <button class="postit-btn" onclick="editPostit(${postit.id})" title="Editar">✏️</button>
                    <button class="postit-btn" onclick="deletePostit(${postit.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
            <div class="postit-content">${postit.content}</div>
            <div class="postit-date">${createdDate}</div>
        `;
        
        grid.appendChild(postitDiv);
    });
}

function openPostitModal(postit = null) {
    currentEditingId = postit ? postit.id : null;
    currentEditingType = 'postit';
    
    const modal = document.getElementById('postitModal');
    const title = document.getElementById('postitModalTitle');
    const form = document.getElementById('postitForm');
    
    title.textContent = postit ? 'Editar Post-it' : 'Nuevo Post-it';
    
    if (postit) {
        document.getElementById('postitTitle').value = postit.title;
        document.getElementById('postitContent').value = postit.content;
        document.querySelector(`input[name="color"][value="${postit.color}"]`).checked = true;
    } else {
        form.reset();
        document.querySelector('input[name="color"]').checked = true;
    }
    
    openModal('postitModal');
}

async function handlePostitSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        title: formData.get('title'),
        content: formData.get('content'),
        color: formData.get('color')
    };
    
    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/api/postits/${currentEditingId}` : 
            `${API_BASE_URL}/api/postits`;
        
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadPostits();
            closeModal('postitModal');
            showNotification(currentEditingId ? 'Post-it actualizado' : 'Post-it creado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar Post-it', 'error');
        }
    } catch (error) {
        console.error('Error saving post-it:', error);
        showNotification('Error al guardar Post-it', 'error');
    }
}

function editPostit(id) {
    const postit = postits.find(p => p.id === id);
    if (postit) {
        openPostitModal(postit);
    }
}

async function deletePostit(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este Post-it?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/postits/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadPostits();
            showNotification('Post-it eliminado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar Post-it', 'error');
        }
    } catch (error) {
        console.error('Error deleting post-it:', error);
        showNotification('Error al eliminar Post-it', 'error');
    }
}

// Recipe functions (keeping existing implementation)
function renderRecipesList() {
    const list = document.getElementById('recipesList');
    list.innerHTML = '';

    if (recipes.length === 0) {
        list.innerHTML = '<p class="text-center">No hay archivos subidos</p>';
        return;
    }

    recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe-card fade-in';
        
        const uploadedDate = new Date(recipe.uploaded_at).toLocaleDateString();
        const fileIcon = getFileIcon(recipe.file_type);
        
        recipeDiv.innerHTML = `
            <div class="recipe-header">
                <div class="recipe-title">${recipe.name}</div>
                <div class="recipe-actions">
                    <button class="btn btn-sm btn-primary" onclick="downloadRecipe(${recipe.id})" title="Descargar">📥</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
            <div class="recipe-info">
                <span class="file-icon">${fileIcon}</span>
                <span>${recipe.filename}</span>
            </div>
            <div class="recipe-date">Subido: ${uploadedDate}</div>
        `;
        
        list.appendChild(recipeDiv);
    });
}

function renderImagesGallery() {
    const gallery = document.getElementById('imagesGallery');
    gallery.innerHTML = '';

    if (recipeImages.length === 0) {
        gallery.innerHTML = '<p class="text-center">No hay imágenes subidas</p>';
        return;
    }

    recipeImages.forEach(image => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-card fade-in';
        
        const uploadedDate = new Date(image.uploaded_at).toLocaleDateString();
        
        imageDiv.innerHTML = `
            <img src="${API_BASE_URL}/${image.file_path}" alt="${image.title}" class="image-preview" onclick="viewImage(${image.id})">
            <div class="image-info">
                <div class="image-title">${image.title}</div>
                <div class="image-comment">${image.comment || 'Sin comentario'}</div>
                <div class="image-meta">
                    <span class="image-date">${uploadedDate}</span>
                    <div class="image-actions">
                        <button class="btn btn-sm btn-primary" onclick="editImage(${image.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteImage(${image.id})" title="Eliminar">🗑️</button>
                    </div>
                </div>
            </div>
        `;
        
        gallery.appendChild(imageDiv);
    });
}

function getFileIcon(fileType) {
    const icons = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'xls': '📊',
        'xlsx': '📊',
        'txt': '📄'
    };
    return icons[fileType] || '📄';
}

async function handleFileUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            await loadRecipes();
            closeModal('uploadFileModal');
            showNotification('Archivo subido correctamente', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al subir archivo', 'error');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showNotification('Error al subir archivo', 'error');
    }
}

async function handleImageUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/imagenes/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            await loadRecipeImages();
            closeModal('uploadImageModal');
            showNotification('Imagen subida correctamente', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al subir imagen', 'error');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('Error al subir imagen', 'error');
    }
}

function downloadRecipe(id) {
    window.open(`${API_BASE_URL}/api/recetas/${id}/download`, '_blank');
}

async function deleteRecipe(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadRecipes();
            showNotification('Archivo eliminado', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar archivo', 'error');
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        showNotification('Error al eliminar archivo', 'error');
    }
}

function viewImage(id) {
    const image = recipeImages.find(img => img.id === id);
    if (!image) return;
    
    document.getElementById('imageViewTitle').textContent = image.title;
    document.getElementById('imageViewImg').src = `${API_BASE_URL}/${image.file_path}`;
    document.getElementById('imageViewComment').textContent = image.comment || 'Sin comentario';
    document.getElementById('imageViewDate').textContent = `Subido: ${new Date(image.uploaded_at).toLocaleDateString()}`;
    
    openModal('imageViewModal');
}

function editImage(id) {
    const image = recipeImages.find(img => img.id === id);
    if (!image) return;
    
    const newTitle = prompt('Nuevo título:', image.title);
    if (newTitle === null) return;
    
    const newComment = prompt('Nuevo comentario:', image.comment || '');
    if (newComment === null) return;
    
    updateImage(id, { title: newTitle, comment: newComment });
}

async function updateImage(id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/imagenes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadRecipeImages();
            showNotification('Imagen actualizada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al actualizar imagen', 'error');
        }
    } catch (error) {
        console.error('Error updating image:', error);
        showNotification('Error al actualizar imagen', 'error');
    }
}

async function deleteImage(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/recetas/imagenes/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadRecipeImages();
            showNotification('Imagen eliminada', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar imagen', 'error');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Error al eliminar imagen', 'error');
    }
}

// Chart loading functions (keeping existing implementation)
async function loadAllCharts() {
    await Promise.all([
        loadDashboardCharts(),
        loadProductCharts(),
        loadStageCharts(),
        loadSubstageCharts(),
        loadLocationCharts()
    ]);
}

async function loadDashboardCharts() {
    try {
        const [consumption, stock, locationConsumption, stageConsumption, stageExpenses, locationExpenses, stageTime, substageTime, locationTime] = await Promise.all([
            fetch(`${API_BASE_URL}/api/graficos/consumo-producto`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/stock-productos`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-etapa`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gastos-etapa`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gastos-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/tiempo-etapas`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/tiempo-sub-etapas`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/tiempo-locacion`).then(r => r.json())
        ]);

        createConsumptionChart('dashboardConsumptionChart', consumption);
        createStockChart('dashboardStockChart', stock);
        createLocationConsumptionChart('dashboardLocationChart', locationConsumption);
        createStageConsumptionChart('dashboardStageChart', stageConsumption);
        createExpensesChart('dashboardExpensesChart', stageExpenses);
        createExpensesChart('dashboardLocationExpensesChart', locationExpenses);
        createTimeComparisonChart('dashboardStageTimeChart', stageTime);
        createTimeComparisonChart('dashboardSubstageTimeChart', substageTime);
        createLocationTimeChart('dashboardLocationTimeChart', locationTime);
    } catch (error) {
        console.error('Error loading dashboard charts:', error);
    }
}

async function loadProductCharts() {
    try {
        const [consumption, stock, locationConsumption, stageConsumption, 
               productSubstageConsumption, monthlyConsumption, monthlyExpense,
               yearlyConsumption, yearlyExpense] = await Promise.all([
            fetch(`${API_BASE_URL}/api/graficos/consumo-producto`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/stock-productos`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-etapa`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-producto-subetapa`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-mensual-producto`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gasto-mensual-producto`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-anual-producto`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gasto-anual-producto`).then(r => r.json())
        ]);

        createConsumptionChart('productConsumptionChart', consumption);
        createStockChart('productStockChart', stock);
        createLocationConsumptionChart('productLocationChart', locationConsumption);
        createStageConsumptionChart('productStageChart', stageConsumption);
        createProductSubstageChart('productSubstageChart', productSubstageConsumption);
        createMonthlyConsumptionChart('productMonthlyConsumptionChart', monthlyConsumption);
        createMonthlyExpenseChart('productMonthlyExpenseChart', monthlyExpense);
        createYearlyConsumptionChart('productYearlyConsumptionChart', yearlyConsumption);
        createYearlyExpenseChart('productYearlyExpenseChart', yearlyExpense);
    } catch (error) {
        console.error('Error loading product charts:', error);
    }
}

async function loadStageCharts() {
    try {
        const [expenses, timeComparison, stageConsumption] = await Promise.all([
            fetch(`${API_BASE_URL}/api/graficos/gastos-etapa`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/tiempo-etapas`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-etapa`).then(r => r.json())
        ]);

        createExpensesChart('stageExpensesChart', expenses);
        createTimeComparisonChart('stageTimeChart', timeComparison);
        createStageConsumptionChart('stageConsumptionChart', stageConsumption);
    } catch (error) {
        console.error('Error loading stage charts:', error);
    }
}

async function loadSubstageCharts() {
    try {
        const [timeComparison, consumption, substageExpenses] = await Promise.all([
            fetch(`${API_BASE_URL}/api/graficos/tiempo-sub-etapas`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-sub-etapas`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gasto-subetapa`).then(r => r.json())
        ]);
        
        createTimeComparisonChart('substageTimeChart', timeComparison);
        createSubstageConsumptionChart('substageConsumptionChart', consumption);
        createSubstageExpenseChart('substageExpenseChart', substageExpenses);
    } catch (error) {
        console.error('Error loading substage charts:', error);
    }
}

async function loadLocationCharts() {
    try {
        const [expenses, consumption, timeComparison, monthlyConsumption, 
               monthlyExpense, yearlyConsumption, yearlyExpense] = await Promise.all([
            fetch(`${API_BASE_URL}/api/graficos/gastos-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/tiempo-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-mensual-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gasto-mensual-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/consumo-anual-locacion`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/graficos/gasto-anual-locacion`).then(r => r.json())
        ]);

        createExpensesChart('locationExpensesChart', expenses);
        createLocationConsumptionChart('locationConsumptionChart', consumption);
        createLocationTimeChart('locationTimeChart', timeComparison);
        createMonthlyLocationConsumptionChart('locationMonthlyConsumptionChart', monthlyConsumption);
        createMonthlyLocationExpenseChart('locationMonthlyExpenseChart', monthlyExpense);
        createYearlyLocationConsumptionChart('locationYearlyConsumptionChart', yearlyConsumption);
        createYearlyLocationExpenseChart('locationYearlyExpenseChart', yearlyExpense);
    } catch (error) {
        console.error('Error loading location charts:', error);
    }
}

// Chart creation functions (keeping existing implementation)
function createConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Cantidad Consumida',
                data: Object.values(data),
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
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

    const labels = data.map(item => item.name);
    const currentStock = data.map(item => item.current_stock);
    const minStock = data.map(item => item.min_stock);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Stock Actual',
                    data: currentStock,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Stock Mínimo',
                    data: minStock,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
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

    const locations = Object.keys(data);
    const products = new Set();
    
    // Get all unique products
    locations.forEach(location => {
        Object.keys(data[location]).forEach(product => products.add(product));
    });

    const datasets = Array.from(products).map((product, index) => {
        const colors = [
            'rgba(37, 99, 235, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(168, 85, 247, 0.8)'
        ];
        
        return {
            label: product,
            data: locations.map(location => data[location][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.8', '1'),
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: locations,
            datasets: datasets
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

function createStageConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const stages = Object.keys(data);
    const products = new Set();
    
    // Get all unique products
    stages.forEach(stage => {
        Object.keys(data[stage]).forEach(product => products.add(product));
    });

    const datasets = Array.from(products).map((product, index) => {
        const colors = [
            'rgba(37, 99, 235, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(168, 85, 247, 0.8)'
        ];
        
        return {
            label: product,
            data: stages.map(stage => data[stage][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.8', '1'),
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stages,
            datasets: datasets
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

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(20, 184, 166, 0.8)'
                ],
                borderColor: [
                    'rgba(37, 99, 235, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(20, 184, 166, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createTimeComparisonChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = data.map(item => item.name);
    const expected = data.map(item => item.expected);
    const actual = data.map(item => item.actual);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiempo Esperado (días)',
                    data: expected,
                    backgroundColor: 'rgba(100, 116, 139, 0.8)',
                    borderColor: 'rgba(100, 116, 139, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Tiempo Real (días)',
                    data: actual,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
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

    const labels = Object.keys(data);
    const expected = labels.map(location => data[location].expected);
    const actual = labels.map(location => data[location].actual);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiempo Esperado (días)',
                    data: expected,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Tiempo Real (días)',
                    data: actual,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
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

function createSubstageConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo por Sub-Etapa ($)',
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)',
                    'rgba(83, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': $' + context.parsed.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// ===== NUEVAS FUNCIONES DE GRÁFICOS =====

function createProductSubstageChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Transformar datos para Chart.js
    const datasets = [];
    const substages = Object.keys(data);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    substages.forEach((substage, index) => {
        const products = Object.keys(data[substage]);
        const quantities = products.map(product => data[substage][product]);
        
        datasets.push({
            label: substage,
            data: quantities,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        });
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: substages.length > 0 ? Object.keys(data[substages[0]]) : [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumo por Producto por Sub-Etapa'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Productos'
                    }
                }
            }
        }
    });
}

function createSubstageExpenseChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Gasto por Sub-Etapa'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': $' + context.parsed.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function createMonthlyConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const months = Object.keys(data).sort();
    const products = new Set();
    
    // Obtener todos los productos únicos
    months.forEach(month => {
        Object.keys(data[month]).forEach(product => products.add(product));
    });
    
    const datasets = Array.from(products).map((product, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: product,
            data: months.map(month => data[month][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumo Mensual por Producto'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
                    }
                }
            }
        }
    });
}

function createMonthlyExpenseChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const months = Object.keys(data).sort();
    const products = new Set();
    
    months.forEach(month => {
        Object.keys(data[month]).forEach(product => products.add(product));
    });
    
    const datasets = Array.from(products).map((product, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: product,
            data: months.map(month => data[month][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Gasto Mensual por Producto'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
                    }
                }
            }
        }
    });
}

function createYearlyConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const years = Object.keys(data).sort();
    const products = new Set();
    
    years.forEach(year => {
        Object.keys(data[year]).forEach(product => products.add(product));
    });
    
    const datasets = Array.from(products).map((product, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: product,
            data: years.map(year => data[year][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumo Anual por Producto'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año'
                    }
                }
            }
        }
    });
}

function createYearlyExpenseChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const years = Object.keys(data).sort();
    const products = new Set();
    
    years.forEach(year => {
        Object.keys(data[year]).forEach(product => products.add(product));
    });
    
    const datasets = Array.from(products).map((product, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: product,
            data: years.map(year => data[year][product] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Gasto Anual por Producto'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año'
                    }
                }
            }
        }
    });
}

function createMonthlyLocationConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const months = Object.keys(data).sort();
    const locations = new Set();
    
    months.forEach(month => {
        Object.keys(data[month]).forEach(location => locations.add(location));
    });
    
    const datasets = Array.from(locations).map((location, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: location,
            data: months.map(month => data[month][location] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumo Mensual por Locación'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
                    }
                }
            }
        }
    });
}

function createMonthlyLocationExpenseChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const months = Object.keys(data).sort();
    const locations = new Set();
    
    months.forEach(month => {
        Object.keys(data[month]).forEach(location => locations.add(location));
    });
    
    const datasets = Array.from(locations).map((location, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: location,
            data: months.map(month => data[month][location] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Gasto Mensual por Locación'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
                    }
                }
            }
        }
    });
}

function createYearlyLocationConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const years = Object.keys(data).sort();
    const locations = new Set();
    
    years.forEach(year => {
        Object.keys(data[year]).forEach(location => locations.add(location));
    });
    
    const datasets = Array.from(locations).map((location, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: location,
            data: years.map(year => data[year][location] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumo Anual por Locación'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año'
                    }
                }
            }
        }
    });
}

function createYearlyLocationExpenseChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const years = Object.keys(data).sort();
    const locations = new Set();
    
    years.forEach(year => {
        Object.keys(data[year]).forEach(location => locations.add(location));
    });
    
    const datasets = Array.from(locations).map((location, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: location,
            data: years.map(year => data[year][location] || 0),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Gasto Anual por Locación'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año'
                    }
                }
            }
        }
    });
}

// Helper functions
function updateProductSelects() {
    const selects = document.querySelectorAll('.product-select, #transferProduct');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar producto</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.current_stock} ${product.unit} disponibles)`;
            option.dataset.unit = product.unit;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateLocationSelects() {
    const selects = document.querySelectorAll('#stageLocation, #movementLocation, #transferFromLocation, #transferToLocation');
    selects.forEach(select => {
        const currentValue = select.value;
        
        // Determinar el texto de la opción por defecto según el select
        let defaultText = 'Seleccionar locación';
        if (select.id === 'transferFromLocation') {
            defaultText = 'Seleccionar locación origen';
        } else if (select.id === 'transferToLocation') {
            defaultText = 'Seleccionar locación destino';
        }
        
        select.innerHTML = `<option value="">${defaultText}</option>`;
        
        // Filtrar locaciones según exclusividad para etapas
        let availableLocations = locations;
        if (select.id === 'stageLocation') {
            // Para etapas, filtrar locaciones ya asignadas a otras etapas
            const currentStageId = select.closest('form').querySelector('[name="stage_id"]')?.value;
            const usedLocationIds = stages
                .filter(stage => stage.location_id && stage.id != currentStageId)
                .map(stage => stage.location_id);
            
            availableLocations = locations.filter(location => 
                !usedLocationIds.includes(location.id)
            );
        }
        
        availableLocations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateStageSelects() {
    const selects = document.querySelectorAll('#substageStage, #movementStage');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar etapa</option>';
        
        stages.forEach(stage => {
            const option = document.createElement('option');
            option.value = stage.id;
            option.textContent = stage.name;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateSubstageSelects() {
    const select = document.getElementById('movementSubstage');
    const stageId = document.getElementById('movementStage').value;
    
    select.innerHTML = '<option value="">Seleccionar sub-etapa</option>';
    
    if (stageId) {
        const stageSubstages = substages.filter(s => s.stage_id == stageId);
        stageSubstages.forEach(substage => {
            const option = document.createElement('option');
            option.value = substage.id;
            option.textContent = substage.name;
            select.appendChild(option);
        });
    }
}

function updateSubstageOptions() {
    updateSubstageSelects();
}

function updateLocationFilter() {
    const filter = document.getElementById('locationFilter');
    const currentValue = filter.value;
    filter.innerHTML = '<option value="">Todas las locaciones</option>';
    
    const uniqueLocations = [...new Set(movements.map(m => m.location))];
    uniqueLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        filter.appendChild(option);
    });
    
    if (currentValue) {
        filter.value = currentValue;
    }
}

function updateUnitDisplay(select) {
    const productId = select.value;
    const unitDisplay = select.parentNode.querySelector('.unit-display');
    
    if (productId && unitDisplay) {
        const product = products.find(p => p.id == productId);
        if (product) {
            unitDisplay.textContent = product.unit;
        }
    }
}

function updateTransferUnit() {
    const productId = document.getElementById('transferProduct').value;
    const unitDisplay = document.getElementById('transferUnit');
    
    if (productId) {
        const product = products.find(p => p.id == productId);
        if (product) {
            unitDisplay.textContent = product.unit;
        }
    } else {
        unitDisplay.textContent = '';
    }
}

// Filter functions
function applyFilters() {
    renderMovementsTable();
}

function clearFilters() {
    document.getElementById('typeFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('dateFilter').value = '';
    renderMovementsTable();
}

// Product row management
function addProductRow() {
    const container = document.getElementById('productsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'product-row';
    newRow.innerHTML = `
        <select class="product-select" name="product_id" required>
            <option value="">Seleccionar producto</option>
        </select>
        <input type="number" class="quantity-input" name="quantity" placeholder="Cantidad" step="0.01" min="0.01" required>
        <span class="unit-display"></span>
        <button type="button" class="btn btn-danger btn-sm remove-product">Eliminar</button>
    `;
    
    container.appendChild(newRow);
    updateProductSelects();
    
    // Add event listener for remove button
    newRow.querySelector('.remove-product').addEventListener('click', () => {
        if (container.children.length > 1) {
            newRow.remove();
        }
    });
}

// Initialize remove product buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-product')) {
        const container = document.getElementById('productsContainer');
        if (container.children.length > 1) {
            e.target.parentNode.remove();
        }
    }
});

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    // Limpiar formularios al cerrar modal
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        
        // Limpiar campos hidden específicos
        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(input => input.value = '');
        
        // Resetear dropdowns a su estado inicial
        const selects = form.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
    }
    
    // Limpiar variables globales de edición
    currentEditingId = null;
    currentEditingType = null;
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Export function
async function exportToExcel() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/exportar-excel`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventario_cultivo_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification('Archivo Excel descargado', 'success');
        } else {
            showNotification('Error al exportar Excel', 'error');
        }
    } catch (error) {
        console.error('Error exporting Excel:', error);
        showNotification('Error al exportar Excel', 'error');
    }
}

// Navigation scroll function for mobile
function scrollNavigation(direction) {
    const navigation = document.getElementById('navigation');
    const scrollAmount = 200; // pixels to scroll
    
    if (direction === 'left') {
        navigation.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    } else if (direction === 'right') {
        navigation.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
    
    // Update arrow visibility after scroll
    setTimeout(updateNavigationArrows, 300);
}

// Update navigation arrows visibility
function updateNavigationArrows() {
    const navigation = document.getElementById('navigation');
    const leftArrow = document.getElementById('navArrowLeft');
    const rightArrow = document.getElementById('navArrowRight');
    
    if (!navigation || !leftArrow || !rightArrow) return;
    
    const isAtStart = navigation.scrollLeft <= 0;
    const isAtEnd = navigation.scrollLeft >= (navigation.scrollWidth - navigation.clientWidth);
    
    leftArrow.style.opacity = isAtStart ? '0.3' : '1';
    rightArrow.style.opacity = isAtEnd ? '0.3' : '1';
    
    leftArrow.style.pointerEvents = isAtStart ? 'none' : 'auto';
    rightArrow.style.pointerEvents = isAtEnd ? 'none' : 'auto';
}

// Initialize navigation arrows on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavigationArrows();
    
    // Update arrows on window resize
    window.addEventListener('resize', updateNavigationArrows);
    
    // Update arrows on navigation scroll
    const navigation = document.getElementById('navigation');
    if (navigation) {
        navigation.addEventListener('scroll', updateNavigationArrows);
    }
});

// ===== FUNCIÓN DE RESÚMENES DE ETAPAS =====

async function generateStageReport(stageId) {
    try {
        showNotification('Generando resumen de etapa...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/etapas/${stageId}/resumen`);
        if (!response.ok) {
            throw new Error('Error al generar resumen');
        }
        
        const reportData = await response.json();
        
        // Crear contenido del reporte
        const reportContent = `
RESUMEN DE ETAPA: ${reportData.stage_name}
=====================================

INFORMACIÓN GENERAL:
- Duración Esperada: ${reportData.expected_duration} días
- Duración Real: ${reportData.actual_duration} días
- Estado: ${reportData.status}
- Responsable: ${reportData.responsible}
- Locación: ${reportData.location}

CONSUMOS POR PRODUCTO:
${Object.entries(reportData.consumption_by_product).map(([product, quantity]) => 
    `- ${product}: ${quantity} unidades`
).join('\n')}

GASTOS POR PRODUCTO:
${Object.entries(reportData.expenses_by_product).map(([product, cost]) => 
    `- ${product}: $${cost.toFixed(2)}`
).join('\n')}

RESUMEN FINANCIERO:
- Costo Total: $${reportData.total_cost.toFixed(2)}
- Costo por Día: $${(reportData.total_cost / Math.max(reportData.actual_duration, 1)).toFixed(2)}

SUB-ETAPAS:
${reportData.substages.map(substage => 
    `- ${substage.name}: ${substage.status} (${substage.actual_duration || 0} días)`
).join('\n')}

MOVIMIENTOS REGISTRADOS: ${reportData.total_movements}

Reporte generado el: ${new Date().toLocaleString('es-ES')}
        `;
        
        // Crear y descargar archivo
        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen_etapa_${reportData.stage_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Resumen de etapa descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error generating stage report:', error);
        showNotification('Error al generar resumen de etapa', 'error');
    }
}

