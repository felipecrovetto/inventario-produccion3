from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
import io
import pandas as pd
from decimal import Decimal
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)
CORS(app)

# Configuración para subida de archivos
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Crear directorio de uploads si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'recipes'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'images'), exist_ok=True)

# Configuración de la base de datos en memoria
locations = [
    {"id": 1, "name": "Invernadero Principal", "description": "Invernadero principal para cultivo", "responsible": "Juan Pérez", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Invernadero Secundario", "description": "Invernadero secundario para propagación", "responsible": "María García", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Área de Secado", "description": "Área especializada para secado y curado", "responsible": "Carlos López", "created_at": "2024-01-01T00:00:00"}
]

# Productos con nuevas unidades y opción sin stock
products = [
    {"id": 1, "name": "Fertilizante NPK", "unit": "kg", "initial_stock": 25, "current_stock": 70, "min_stock": 5, "price": 15.50, "has_stock": True, "responsible": "Juan Pérez", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Sustrato Coco", "unit": "kg", "initial_stock": 50, "current_stock": 50, "min_stock": 10, "price": 8.75, "has_stock": True, "responsible": "María García", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Semillas Tomate", "unit": "unidades", "initial_stock": 100, "current_stock": 100, "min_stock": 20, "price": 0.25, "has_stock": True, "responsible": "Carlos López", "created_at": "2024-01-01T00:00:00"},
    {"id": 4, "name": "Agua pH 6.5", "unit": "l", "initial_stock": 20, "current_stock": 8, "min_stock": 15, "price": 1.20, "has_stock": True, "responsible": "Ana Martín", "created_at": "2024-01-01T00:00:00"},
    {"id": 5, "name": "Temperatura Sala A", "unit": "°C", "initial_stock": 0, "current_stock": 25, "min_stock": 0, "price": 0.00, "has_stock": False, "responsible": "Sistema Automático", "created_at": "2024-01-01T00:00:00"},
    {"id": 6, "name": "pH Solución Nutritiva", "unit": "pH", "initial_stock": 0, "current_stock": 6.2, "min_stock": 0, "price": 0.00, "has_stock": False, "responsible": "Sistema Automático", "created_at": "2024-01-01T00:00:00"},
    {"id": 7, "name": "Conductividad Eléctrica", "unit": "EC", "initial_stock": 0, "current_stock": 1.8, "min_stock": 0, "price": 0.00, "has_stock": False, "responsible": "Sistema Automático", "created_at": "2024-01-01T00:00:00"}
]

stages = [
    {"id": 1, "name": "Germinación", "duration": 7, "description": "Proceso inicial de germinación de semillas", "location_id": 2, "expected_duration": 7, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "María García", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Crecimiento", "duration": 30, "description": "Fase de crecimiento vegetativo", "location_id": 1, "expected_duration": 30, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "Juan Pérez", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Floración", "duration": 45, "description": "Etapa de floración y fructificación", "location_id": 1, "expected_duration": 45, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "Carlos López", "created_at": "2024-01-01T00:00:00"}
]

substages = [
    {"id": 1, "name": "Preparación de semillas", "duration": 2, "description": "Preparación y acondicionamiento de semillas", "stage_id": 1, "expected_duration": 2, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "María García", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Siembra", "duration": 5, "description": "Proceso de siembra en sustrato", "stage_id": 1, "expected_duration": 5, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "María García", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Crecimiento inicial", "duration": 15, "description": "Primeras semanas de crecimiento", "stage_id": 2, "expected_duration": 15, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "Juan Pérez", "created_at": "2024-01-01T00:00:00"},
    {"id": 4, "name": "Desarrollo vegetativo", "duration": 15, "description": "Desarrollo completo de la planta", "stage_id": 2, "expected_duration": 15, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "responsible": "Juan Pérez", "created_at": "2024-01-01T00:00:00"}
]

movements = [
    {"id": 1, "date": "2024-01-15T10:30:00", "type": "compra", "products": [{"product_id": 1, "quantity": 50, "unit": "kg"}], "stage_id": None, "substage_id": None, "responsible": "Juan Pérez", "location": "Invernadero Principal", "observations": "Compra inicial de fertilizante", "cost": 775.00},
    {"id": 2, "date": "2024-01-20T08:15:00", "type": "uso", "products": [{"product_id": 1, "quantity": 5, "unit": "kg"}], "stage_id": 2, "substage_id": 3, "responsible": "María García", "location": "Invernadero Principal", "observations": "Aplicación de fertilizante en crecimiento inicial", "cost": 77.50},
    {"id": 3, "date": "2024-02-10T14:20:00", "type": "uso", "products": [{"product_id": 4, "quantity": 12, "unit": "l"}], "stage_id": 1, "substage_id": 2, "responsible": "Carlos López", "location": "Invernadero Secundario", "observations": "Riego durante siembra", "cost": 14.40}
]

# Nuevas estructuras de datos para Post-it y Recetas
postits = [
    {"id": 1, "title": "Revisar pH del agua", "content": "Verificar que el pH del agua esté entre 6.0 y 6.5 antes del próximo riego", "color": "#ffeb3b", "created_at": "2024-01-01T10:00:00", "updated_at": "2024-01-01T10:00:00"},
    {"id": 2, "title": "Fertilización programada", "content": "Aplicar fertilizante NPK en el invernadero principal el viernes", "color": "#4caf50", "created_at": "2024-01-02T14:30:00", "updated_at": "2024-01-02T14:30:00"},
    {"id": 3, "title": "Inspección de plagas", "content": "Revisar las plantas en etapa de floración para detectar posibles plagas", "color": "#f44336", "created_at": "2024-01-03T09:15:00", "updated_at": "2024-01-03T09:15:00"}
]

recipes = [
    {"id": 1, "name": "Manual de Cultivo Hidropónico", "filename": "manual_hidroponico.pdf", "file_type": "pdf", "file_path": "uploads/recipes/manual_hidroponico.pdf", "uploaded_at": "2024-01-01T12:00:00"},
    {"id": 2, "name": "Receta Fertilizante Orgánico", "filename": "fertilizante_organico.docx", "file_type": "docx", "file_path": "uploads/recipes/fertilizante_organico.docx", "uploaded_at": "2024-01-02T15:30:00"}
]

recipe_images = [
    {"id": 1, "title": "Gorila Glue Etapa 4 Floración", "filename": "gorila_glue_floracion.jpg", "file_path": "uploads/images/gorila_glue_floracion.jpg", "comment": "Planta en semana 4 de floración, desarrollo excelente de tricomas", "uploaded_at": "2024-01-01T16:45:00"},
    {"id": 2, "title": "Receta Brownie Cannabis", "filename": "brownie_cannabis.jpg", "file_path": "uploads/images/brownie_cannabis.jpg", "comment": "Brownies con mantequilla de cannabis, perfecta textura y sabor", "uploaded_at": "2024-01-02T18:20:00"}
]

# Responsables por locación
location_responsibles = [
    {"id": 1, "name": "Juan Pérez", "role": "Supervisor Principal", "location_id": 1, "color": "#4caf50", "created_at": "2024-01-01T08:00:00"},
    {"id": 2, "name": "María García", "role": "Especialista en Germinación", "location_id": 2, "color": "#2196f3", "created_at": "2024-01-01T08:00:00"},
    {"id": 3, "name": "Carlos López", "role": "Técnico de Secado", "location_id": 3, "color": "#ff9800", "created_at": "2024-01-01T08:00:00"},
    {"id": 4, "name": "Ana Martín", "role": "Control de Calidad", "location_id": 1, "color": "#9c27b0", "created_at": "2024-01-01T08:00:00"}
]

# Contadores para IDs
next_location_id = 4
next_product_id = 8
next_stage_id = 4
next_substage_id = 5
next_movement_id = 4
next_postit_id = 4
next_recipe_id = 3
next_recipe_image_id = 3
next_responsible_id = 5

# Unidades disponibles
AVAILABLE_UNITS = ['kg', 'g', 'l', 'ml', 'unidades', 'm', 'cm', 'pH', '°C', 'EC']

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_location_name(location_id):
    """Obtiene el nombre de una locación por su ID"""
    location = next((loc for loc in locations if loc["id"] == location_id), None)
    return location["name"] if location else "Desconocida"

def get_product_by_id(product_id):
    """Obtiene un producto por su ID"""
    return next((prod for prod in products if prod["id"] == product_id), None)

def get_stage_by_id(stage_id):
    """Obtiene una etapa por su ID"""
    return next((stage for stage in stages if stage["id"] == stage_id), None)

def get_substage_by_id(substage_id):
    """Obtiene una sub-etapa por su ID"""
    return next((substage for substage in substages if substage["id"] == substage_id), None)

def get_location_by_id(location_id):
    """Obtiene una locación por su ID"""
    return next((location for location in locations if location["id"] == location_id), None)

def is_location_available_for_stage(location_id, exclude_stage_id=None):
    """Verifica si una locación está disponible para asignar a una etapa"""
    if not location_id:
        return True
    
    for stage in stages:
        if stage.get('location_id') == location_id and stage['id'] != exclude_stage_id:
            return False
    return True

def is_substage_available_for_stage(substage_id, exclude_stage_id=None):
    """Verifica si una sub-etapa está disponible para asignar a una etapa"""
    if not substage_id:
        return True
    
    for substage in substages:
        if substage['id'] == substage_id and substage.get('stage_id') != exclude_stage_id:
            return False
    return True

def get_available_locations_for_stage(exclude_stage_id=None):
    """Obtiene locaciones disponibles para asignar a etapas"""
    available = []
    for location in locations:
        if is_location_available_for_stage(location['id'], exclude_stage_id):
            available.append(location)
    return available

def get_available_substages_for_stage(exclude_stage_id=None):
    """Obtiene sub-etapas disponibles para asignar a etapas"""
    available = []
    for substage in substages:
        if not substage.get('stage_id') or substage.get('stage_id') == exclude_stage_id:
            available.append(substage)
    return available

def update_product_stock(product_id, quantity_used):
    """Actualiza el stock de un producto"""
    product = get_product_by_id(product_id)
    if product and product.get('has_stock', True):
        product['current_stock'] -= quantity_used
        if product['current_stock'] < 0:
            product['current_stock'] = 0

def add_product_stock(product_id, quantity_added):
    """Agrega stock a un producto"""
    product = get_product_by_id(product_id)
    if product and product.get('has_stock', True):
        product['current_stock'] += quantity_added

@app.route('/')
def index():
    return render_template('index.html')

# Endpoints para productos
@app.route('/api/productos', methods=['GET'])
def get_products():
    return jsonify(products)

@app.route('/api/productos', methods=['POST'])
def create_product():
    global next_product_id
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('name') or not data.get('unit'):
            return jsonify({"error": "Nombre y unidad son obligatorios"}), 400
        
        if data.get('unit') not in AVAILABLE_UNITS:
            return jsonify({"error": "Unidad no válida"}), 400
        
        has_stock = data.get('has_stock', True)
        
        new_product = {
            "id": next_product_id,
            "name": data['name'],
            "unit": data['unit'],
            "initial_stock": float(data.get('initial_stock', 0)) if has_stock else 0,
            "current_stock": float(data.get('current_stock', 0)) if has_stock else float(data.get('current_value', 0)),
            "min_stock": float(data.get('min_stock', 0)) if has_stock else 0,
            "price": float(data.get('price', 0)),
            "has_stock": has_stock,
            "responsible": data.get('responsible', ''),
            "created_at": datetime.now().isoformat()
        }
        
        products.append(new_product)
        next_product_id += 1
        
        return jsonify(new_product), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.get_json()
        product = get_product_by_id(product_id)
        
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        # Validaciones
        if data.get('unit') and data['unit'] not in AVAILABLE_UNITS:
            return jsonify({"error": "Unidad no válida"}), 400
        
        has_stock = data.get('has_stock', product.get('has_stock', True))
        
        # Actualizar campos
        if 'name' in data:
            product['name'] = data['name']
        if 'unit' in data:
            product['unit'] = data['unit']
        if 'price' in data:
            product['price'] = float(data['price'])
        if 'responsible' in data:
            product['responsible'] = data['responsible']
        
        product['has_stock'] = has_stock
        
        if has_stock:
            if 'initial_stock' in data:
                product['initial_stock'] = float(data['initial_stock'])
            if 'current_stock' in data:
                product['current_stock'] = float(data['current_stock'])
            if 'min_stock' in data:
                product['min_stock'] = float(data['min_stock'])
        else:
            # Para variables sin stock, usar current_stock como valor actual
            if 'current_value' in data:
                product['current_stock'] = float(data['current_value'])
            product['initial_stock'] = 0
            product['min_stock'] = 0
        
        return jsonify(product)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    global products
    try:
        product = get_product_by_id(product_id)
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        products = [p for p in products if p['id'] != product_id]
        return jsonify({"message": "Producto eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para locaciones
@app.route('/api/locaciones', methods=['GET'])
def get_locations():
    return jsonify(locations)

@app.route('/api/locaciones', methods=['POST'])
def create_location():
    global next_location_id
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({"error": "Nombre es obligatorio"}), 400
        
        new_location = {
            "id": next_location_id,
            "name": data['name'],
            "description": data.get('description', ''),
            "responsible": data.get('responsible', ''),
            "created_at": datetime.now().isoformat()
        }
        
        locations.append(new_location)
        next_location_id += 1
        
        return jsonify(new_location), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/locaciones/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    try:
        data = request.get_json()
        location = next((loc for loc in locations if loc["id"] == location_id), None)
        
        if not location:
            return jsonify({"error": "Locación no encontrada"}), 404
        
        if 'name' in data:
            location['name'] = data['name']
        if 'description' in data:
            location['description'] = data['description']
        if 'responsible' in data:
            location['responsible'] = data['responsible']
        
        return jsonify(location)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/locaciones/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    global locations
    try:
        location = next((loc for loc in locations if loc["id"] == location_id), None)
        if not location:
            return jsonify({"error": "Locación no encontrada"}), 404
        
        # Verificar si hay etapas asociadas
        associated_stages = [s for s in stages if s.get('location_id') == location_id]
        if associated_stages:
            return jsonify({"error": "No se puede eliminar la locación porque tiene etapas asociadas"}), 400
        
        locations = [loc for loc in locations if loc['id'] != location_id]
        return jsonify({"message": "Locación eliminada correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para etapas
@app.route('/api/etapas', methods=['GET'])
def get_stages():
    stages_with_location = []
    for stage in stages:
        stage_copy = stage.copy()
        stage_copy['location_name'] = get_location_name(stage.get('location_id'))
        stages_with_location.append(stage_copy)
    return jsonify(stages_with_location)

@app.route('/api/etapas', methods=['POST'])
def create_stage():
    global next_stage_id
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('expected_duration') or not data.get('responsible'):
            return jsonify({"error": "Nombre, duración esperada y responsable son obligatorios"}), 400
        
        # Nueva lógica: Una locación puede tener múltiples etapas activas
        # Solo validamos que la locación existe
        location_id = data.get('location_id')
        if location_id:
            location = next((loc for loc in locations if loc["id"] == location_id), None)
            if not location:
                return jsonify({"error": "Locación no encontrada"}), 404
        
        new_stage = {
            "id": next_stage_id,
            "name": data['name'],
            "description": data.get('description', ''),
            "location_id": location_id,
            "expected_duration": int(data['expected_duration']),
            "start_time": None,
            "end_time": None,
            "actual_duration": None,
            "status": "pending",
            "responsible": data['responsible'],
            "created_at": datetime.now().isoformat(),
            "cycle_name": data.get('cycle_name', ''),  # Nuevo campo para ciclos
            "is_completed": False  # Nuevo campo para marcar etapas completadas
        }
        
        stages.append(new_stage)
        next_stage_id += 1
        
        return jsonify(new_stage), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>', methods=['PUT'])
def update_stage(stage_id):
    try:
        data = request.get_json()
        stage = get_stage_by_id(stage_id)
        
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        # Validar campos obligatorios
        if 'name' in data and not data['name']:
            return jsonify({"error": "Nombre es obligatorio"}), 400
        if 'expected_duration' in data and not data['expected_duration']:
            return jsonify({"error": "Duración esperada es obligatoria"}), 400
        if 'responsible' in data and not data['responsible']:
            return jsonify({"error": "Responsable es obligatorio"}), 400
        
        # Validar exclusividad de locación
        if 'location_id' in data:
            location_id = data['location_id']
            if location_id and not is_location_available_for_stage(location_id, stage_id):
                return jsonify({"error": "La locación seleccionada ya está asignada a otra etapa"}), 400
        
        if 'name' in data:
            stage['name'] = data['name']
        if 'description' in data:
            stage['description'] = data['description']
        if 'location_id' in data:
            stage['location_id'] = data['location_id']
        if 'expected_duration' in data:
            stage['expected_duration'] = int(data['expected_duration'])
        if 'responsible' in data:
            stage['responsible'] = data['responsible']
        
        return jsonify(stage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>', methods=['DELETE'])
def delete_stage(stage_id):
    global stages
    try:
        stage = get_stage_by_id(stage_id)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        # Verificar si hay sub-etapas asociadas
        associated_substages = [s for s in substages if s.get('stage_id') == stage_id]
        if associated_substages:
            return jsonify({"error": "No se puede eliminar la etapa porque tiene sub-etapas asociadas"}), 400
        
        stages = [s for s in stages if s['id'] != stage_id]
        return jsonify({"message": "Etapa eliminada correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>/iniciar', methods=['POST'])
def start_stage(stage_id):
    try:
        stage = get_stage_by_id(stage_id)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        if stage['status'] != 'pending':
            return jsonify({"error": "La etapa ya ha sido iniciada"}), 400
        
        stage['status'] = 'in_progress'
        stage['start_time'] = datetime.now().isoformat()
        
        return jsonify(stage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>/finalizar', methods=['POST'])
def finish_stage(stage_id):
    try:
        stage = get_stage_by_id(stage_id)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        if stage['status'] != 'in_progress':
            return jsonify({"error": "La etapa no está en progreso"}), 400
        
        stage['status'] = 'completed'
        stage['end_time'] = datetime.now().isoformat()
        
        if stage['start_time']:
            start_date = datetime.fromisoformat(stage['start_time'])
            end_date = datetime.fromisoformat(stage['end_time'])
            stage['actual_duration'] = (end_date - start_date).days
        
        return jsonify(stage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para sub-etapas
@app.route('/api/sub-etapas', methods=['GET'])
def get_substages():
    substages_with_stage = []
    for substage in substages:
        substage_copy = substage.copy()
        stage = get_stage_by_id(substage.get('stage_id'))
        substage_copy['stage_name'] = stage['name'] if stage else 'Desconocida'
        substages_with_stage.append(substage_copy)
    return jsonify(substages_with_stage)

@app.route('/api/sub-etapas', methods=['POST'])
def create_substage():
    global next_substage_id
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('expected_duration') or not data.get('stage_id') or not data.get('responsible'):
            return jsonify({"error": "Nombre, duración esperada, etapa y responsable son obligatorios"}), 400
        
        stage_id = int(data['stage_id'])
        
        # Verificar que la etapa existe
        stage = next((s for s in stages if s["id"] == stage_id), None)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        # Validar que la etapa solo tenga una subetapa activa a la vez
        active_substages = [s for s in substages if s['stage_id'] == stage_id and s['status'] == 'in_progress']
        if active_substages:
            return jsonify({"error": "La etapa ya tiene una subetapa activa. Finaliza la subetapa actual antes de crear una nueva."}), 400
        
        new_substage = {
            "id": next_substage_id,
            "name": data['name'],
            "description": data.get('description', ''),
            "stage_id": stage_id,
            "expected_duration": int(data['expected_duration']),
            "start_time": None,
            "end_time": None,
            "actual_duration": None,
            "status": "pending",
            "responsible": data['responsible'],
            "created_at": datetime.now().isoformat()
        }
        
        substages.append(new_substage)
        next_substage_id += 1
        
        return jsonify(new_substage), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sub-etapas/<int:substage_id>', methods=['PUT'])
def update_substage(substage_id):
    try:
        data = request.get_json()
        substage = get_substage_by_id(substage_id)
        
        if not substage:
            return jsonify({"error": "Sub-etapa no encontrada"}), 404
        
        if 'name' in data:
            substage['name'] = data['name']
        if 'description' in data:
            substage['description'] = data['description']
        if 'stage_id' in data:
            substage['stage_id'] = int(data['stage_id'])
        if 'expected_duration' in data:
            substage['expected_duration'] = int(data['expected_duration'])
        if 'responsible' in data:
            substage['responsible'] = data['responsible']
        
        return jsonify(substage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sub-etapas/<int:substage_id>', methods=['DELETE'])
def delete_substage(substage_id):
    global substages
    try:
        substage = get_substage_by_id(substage_id)
        if not substage:
            return jsonify({"error": "Sub-etapa no encontrada"}), 404
        
        substages = [s for s in substages if s['id'] != substage_id]
        return jsonify({"message": "Sub-etapa eliminada correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sub-etapas/<int:substage_id>/iniciar', methods=['POST'])
def start_substage(substage_id):
    try:
        substage = get_substage_by_id(substage_id)
        if not substage:
            return jsonify({"error": "Sub-etapa no encontrada"}), 404
        
        if substage['status'] != 'pending':
            return jsonify({"error": "La sub-etapa ya ha sido iniciada"}), 400
        
        substage['status'] = 'in_progress'
        substage['start_time'] = datetime.now().isoformat()
        
        return jsonify(substage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sub-etapas/<int:substage_id>/finalizar', methods=['POST'])
def finish_substage(substage_id):
    try:
        substage = get_substage_by_id(substage_id)
        if not substage:
            return jsonify({"error": "Sub-etapa no encontrada"}), 404
        
        if substage['status'] != 'in_progress':
            return jsonify({"error": "La sub-etapa no está en progreso"}), 400
        
        substage['status'] = 'completed'
        substage['end_time'] = datetime.now().isoformat()
        
        if substage['start_time']:
            start_date = datetime.fromisoformat(substage['start_time'])
            end_date = datetime.fromisoformat(substage['end_time'])
            substage['actual_duration'] = (end_date - start_date).days
        
        return jsonify(substage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para movimientos
@app.route('/api/movimientos', methods=['GET'])
def get_movements():
    movements_with_details = []
    for movement in movements:
        movement_copy = movement.copy()
        
        # Agregar nombres de etapa y sub-etapa
        if movement.get('stage_id'):
            stage = get_stage_by_id(movement['stage_id'])
            movement_copy['stage_name'] = stage['name'] if stage else 'Desconocida'
        else:
            movement_copy['stage_name'] = None
            
        if movement.get('substage_id'):
            substage = get_substage_by_id(movement['substage_id'])
            movement_copy['substage_name'] = substage['name'] if substage else 'Desconocida'
        else:
            movement_copy['substage_name'] = None
        
        # Agregar detalles de productos
        products_with_names = []
        for product_movement in movement.get('products', []):
            product = get_product_by_id(product_movement['product_id'])
            product_detail = product_movement.copy()
            product_detail['product_name'] = product['name'] if product else 'Desconocido'
            products_with_names.append(product_detail)
        
        movement_copy['products'] = products_with_names
        movements_with_details.append(movement_copy)
    
    return jsonify(movements_with_details)

@app.route('/api/movimientos', methods=['POST'])
def create_movement():
    global next_movement_id
    try:
        data = request.get_json()
        
        if not data.get('type') or not data.get('products') or not data.get('responsible'):
            return jsonify({"error": "Tipo, productos y responsable son obligatorios"}), 400
        
        total_cost = 0
        products_data = []
        
        for product_data in data['products']:
            product_id = product_data['product_id']
            quantity = float(product_data['quantity'])
            
            product = get_product_by_id(product_id)
            if not product:
                return jsonify({"error": f"Producto con ID {product_id} no encontrado"}), 404
            
            # Validar stock solo para productos que manejan stock
            if product.get('has_stock', True) and data['type'] in ['uso', 'transferencia']:
                if product['current_stock'] < quantity:
                    return jsonify({"error": f"Stock insuficiente para {product['name']}"}), 400
            
            product_movement = {
                "product_id": product_id,
                "quantity": quantity,
                "unit": product['unit']
            }
            products_data.append(product_movement)
            
            # Calcular costo
            cost = quantity * product['price']
            total_cost += cost
            
            # Actualizar stock
            if product.get('has_stock', True):
                if data['type'] == 'compra':
                    add_product_stock(product_id, quantity)
                elif data['type'] in ['uso', 'transferencia']:
                    update_product_stock(product_id, quantity)
        
        # Obtener nombre de locación si se proporciona location_id
        location_name = ''
        if data.get('location_id'):
            location = get_location_by_id(data['location_id'])
            if location:
                location_name = location['name']
        
        new_movement = {
            "id": next_movement_id,
            "date": datetime.now().isoformat(),
            "type": data['type'],
            "products": products_data,
            "stage_id": data.get('stage_id'),
            "substage_id": data.get('substage_id'),
            "responsible": data['responsible'],
            "location": location_name,
            "location_id": data.get('location_id'),
            "observations": data.get('observations', ''),
            "cost": total_cost
        }
        
        movements.append(new_movement)
        next_movement_id += 1
        
        return jsonify(new_movement), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/movimientos/<int:movement_id>', methods=['PUT'])
def update_movement(movement_id):
    try:
        movement = next((m for m in movements if m["id"] == movement_id), None)
        if not movement:
            return jsonify({"error": "Movimiento no encontrado"}), 404
        
        data = request.get_json()
        
        if not data.get('responsible'):
            return jsonify({"error": "Responsable es obligatorio"}), 400
        
        # Actualizar campos básicos
        if 'stage_id' in data:
            movement['stage_id'] = data['stage_id']
        if 'substage_id' in data:
            movement['substage_id'] = data['substage_id']
        if 'responsible' in data:
            movement['responsible'] = data['responsible']
        if 'observations' in data:
            movement['observations'] = data['observations']
        
        # Actualizar locación si se proporciona
        if 'location_id' in data:
            movement['location_id'] = data['location_id']
            if data['location_id']:
                location = get_location_by_id(data['location_id'])
                if location:
                    movement['location'] = location['name']
        
        return jsonify(movement)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/movimientos/<int:movement_id>', methods=['DELETE'])
def delete_movement(movement_id):
    global movements
    try:
        movement = next((m for m in movements if m["id"] == movement_id), None)
        if not movement:
            return jsonify({"error": "Movimiento no encontrado"}), 404
        
        movements = [m for m in movements if m['id'] != movement_id]
        return jsonify({"message": "Movimiento eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para dashboard
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    try:
        # Calcular KPIs
        total_products = len(products)
        total_stages = len(stages)
        total_locations = len(locations)
        total_movements = len(movements)
        total_cost = sum(movement['cost'] for movement in movements)
        
        # Alertas de stock bajo
        low_stock_alerts = []
        for product in products:
            if product.get('has_stock', True):  # Solo para productos con stock
                if product['current_stock'] <= product['min_stock']:
                    status = 'crítico' if product['current_stock'] == 0 else 'bajo'
                    low_stock_alerts.append({
                        'product_name': product['name'],
                        'current_stock': product['current_stock'],
                        'min_stock': product['min_stock'],
                        'unit': product['unit'],
                        'status': status
                    })
        
        return jsonify({
            'total_products': total_products,
            'total_stages': total_stages,
            'total_locations': total_locations,
            'total_movements': total_movements,
            'total_cost': total_cost,
            'low_stock_alerts': low_stock_alerts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para gráficos (mantenidos del código original)
@app.route('/api/graficos/consumo-producto', methods=['GET'])
def get_consumption_by_product():
    try:
        consumption = {}
        for movement in movements:
            if movement['type'] == 'uso':
                for product_data in movement['products']:
                    product = get_product_by_id(product_data['product_id'])
                    if product:
                        product_name = product['name']
                        if product_name not in consumption:
                            consumption[product_name] = 0
                        consumption[product_name] += product_data['quantity']
        return jsonify(consumption)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/stock-productos', methods=['GET'])
def get_stock_chart():
    try:
        stock_data = []
        for product in products:
            if product.get('has_stock', True):  # Solo productos con stock
                stock_data.append({
                    'name': product['name'],
                    'current_stock': product['current_stock'],
                    'min_stock': product['min_stock'],
                    'unit': product['unit']
                })
        return jsonify(stock_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-locacion', methods=['GET'])
def get_consumption_by_location():
    try:
        consumption = {}
        for movement in movements:
            if movement['type'] == 'uso':
                location = movement.get('location', 'Sin especificar')
                if location not in consumption:
                    consumption[location] = {}
                
                for product_data in movement['products']:
                    product = get_product_by_id(product_data['product_id'])
                    if product:
                        product_name = product['name']
                        if product_name not in consumption[location]:
                            consumption[location][product_name] = 0
                        consumption[location][product_name] += product_data['quantity']
        return jsonify(consumption)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gastos-etapa', methods=['GET'])
def get_expenses_by_stage():
    try:
        expenses = {}
        for movement in movements:
            if movement.get('stage_id'):
                stage = get_stage_by_id(movement['stage_id'])
                if stage:
                    stage_name = stage['name']
                    if stage_name not in expenses:
                        expenses[stage_name] = 0
                    expenses[stage_name] += movement['cost']
        return jsonify(expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gastos-locacion', methods=['GET'])
def get_expenses_by_location():
    try:
        expenses = {}
        for movement in movements:
            location = movement.get('location', 'Sin especificar')
            if location not in expenses:
                expenses[location] = 0
            expenses[location] += movement['cost']
        return jsonify(expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/tiempo-etapas', methods=['GET'])
def get_time_comparison_stages():
    try:
        time_data = []
        for stage in stages:
            actual_time = 0
            if stage['status'] == 'completed' and stage.get('actual_duration'):
                actual_time = stage['actual_duration']
            elif stage['status'] == 'in_progress' and stage.get('start_time'):
                start_date = datetime.fromisoformat(stage['start_time'])
                actual_time = (datetime.now() - start_date).days
            
            time_data.append({
                'name': stage['name'],
                'expected': stage['expected_duration'],
                'actual': actual_time
            })
        return jsonify(time_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/tiempo-sub-etapas', methods=['GET'])
def get_time_comparison_substages():
    try:
        time_data = []
        for substage in substages:
            actual_time = 0
            if substage['status'] == 'completed' and substage.get('actual_duration'):
                actual_time = substage['actual_duration']
            elif substage['status'] == 'in_progress' and substage.get('start_time'):
                start_date = datetime.fromisoformat(substage['start_time'])
                actual_time = (datetime.now() - start_date).days
            
            time_data.append({
                'name': substage['name'],
                'expected': substage['expected_duration'],
                'actual': actual_time
            })
        return jsonify(time_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/tiempo-locacion', methods=['GET'])
def get_time_by_location():
    try:
        location_time = {}
        for stage in stages:
            if stage.get('location_id'):
                location_name = get_location_name(stage['location_id'])
                if location_name not in location_time:
                    location_time[location_name] = {'expected': 0, 'actual': 0}
                
                location_time[location_name]['expected'] += stage['expected_duration']
                
                if stage['status'] == 'completed' and stage.get('actual_duration'):
                    location_time[location_name]['actual'] += stage['actual_duration']
                elif stage['status'] == 'in_progress' and stage.get('start_time'):
                    start_date = datetime.fromisoformat(stage['start_time'])
                    actual_time = (datetime.now() - start_date).days
                    location_time[location_name]['actual'] += actual_time
        
        return jsonify(location_time)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-sub-etapas', methods=['GET'])
def get_consumption_by_substage():
    try:
        substage_consumption = {}
        for movement in movements:
            if movement['type'] == 'uso' and movement.get('substage_id'):
                substage = get_substage_by_id(movement['substage_id'])
                if substage:
                    substage_name = substage['name']
                    if substage_name not in substage_consumption:
                        substage_consumption[substage_name] = 0
                    
                    # Sumar el costo total del movimiento para esta sub-etapa
                    substage_consumption[substage_name] += movement.get('cost', 0)
        
        return jsonify(substage_consumption)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== NUEVOS ENDPOINTS PARA GRÁFICOS AVANZADOS =====

@app.route('/api/graficos/consumo-producto-subetapa', methods=['GET'])
def get_consumption_by_product_substage():
    """Gráfico de consumo por producto por subetapa"""
    try:
        data = {}
        for movement in movements:
            if movement['type'] == 'uso' and movement.get('substage_id'):
                substage = get_substage_by_id(movement['substage_id'])
                if substage:
                    substage_name = substage['name']
                    if substage_name not in data:
                        data[substage_name] = {}
                    
                    for product_usage in movement['products']:
                        product = get_product_by_id(product_usage['product_id'])
                        if product:
                            product_name = product['name']
                            if product_name not in data[substage_name]:
                                data[substage_name][product_name] = 0
                            data[substage_name][product_name] += product_usage['quantity']
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-etapa', methods=['GET'])
def get_consumption_by_stage():
    """Gráfico de consumo por etapa"""
    try:
        stage_consumption = {}
        for movement in movements:
            if movement['type'] == 'uso' and movement.get('stage_id'):
                stage = get_stage_by_id(movement['stage_id'])
                if stage:
                    stage_name = stage['name']
                    if stage_name not in stage_consumption:
                        stage_consumption[stage_name] = 0
                    stage_consumption[stage_name] += movement.get('cost', 0)
        
        return jsonify(stage_consumption)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gasto-subetapa', methods=['GET'])
def get_expense_by_substage():
    """Gráfico de gasto por subetapa"""
    try:
        substage_expenses = {}
        for movement in movements:
            if movement.get('substage_id'):
                substage = get_substage_by_id(movement['substage_id'])
                if substage:
                    substage_name = substage['name']
                    if substage_name not in substage_expenses:
                        substage_expenses[substage_name] = 0
                    substage_expenses[substage_name] += movement.get('cost', 0)
        
        return jsonify(substage_expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-mensual-producto', methods=['GET'])
def get_monthly_consumption_by_product():
    """Gráfico de consumo mensual por producto"""
    try:
        from datetime import datetime
        monthly_data = {}
        
        for movement in movements:
            if movement['type'] == 'uso':
                date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
                month_key = date.strftime('%Y-%m')
                
                if month_key not in monthly_data:
                    monthly_data[month_key] = {}
                
                for product_usage in movement['products']:
                    product = get_product_by_id(product_usage['product_id'])
                    if product:
                        product_name = product['name']
                        if product_name not in monthly_data[month_key]:
                            monthly_data[month_key][product_name] = 0
                        monthly_data[month_key][product_name] += product_usage['quantity']
        
        return jsonify(monthly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gasto-mensual-producto', methods=['GET'])
def get_monthly_expense_by_product():
    """Gráfico de gasto mensual por producto"""
    try:
        from datetime import datetime
        monthly_data = {}
        
        for movement in movements:
            date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
            month_key = date.strftime('%Y-%m')
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {}
            
            for product_usage in movement['products']:
                product = get_product_by_id(product_usage['product_id'])
                if product:
                    product_name = product['name']
                    if product_name not in monthly_data[month_key]:
                        monthly_data[month_key][product_name] = 0
                    
                    cost_per_unit = product['price']
                    total_cost = product_usage['quantity'] * cost_per_unit
                    monthly_data[month_key][product_name] += total_cost
        
        return jsonify(monthly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-anual-producto', methods=['GET'])
def get_yearly_consumption_by_product():
    """Gráfico de consumo anual por producto"""
    try:
        from datetime import datetime
        yearly_data = {}
        
        for movement in movements:
            if movement['type'] == 'uso':
                date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
                year_key = str(date.year)
                
                if year_key not in yearly_data:
                    yearly_data[year_key] = {}
                
                for product_usage in movement['products']:
                    product = get_product_by_id(product_usage['product_id'])
                    if product:
                        product_name = product['name']
                        if product_name not in yearly_data[year_key]:
                            yearly_data[year_key][product_name] = 0
                        yearly_data[year_key][product_name] += product_usage['quantity']
        
        return jsonify(yearly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gasto-anual-producto', methods=['GET'])
def get_yearly_expense_by_product():
    """Gráfico de gasto anual por producto"""
    try:
        from datetime import datetime
        yearly_data = {}
        
        for movement in movements:
            date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
            year_key = str(date.year)
            
            if year_key not in yearly_data:
                yearly_data[year_key] = {}
            
            for product_usage in movement['products']:
                product = get_product_by_id(product_usage['product_id'])
                if product:
                    product_name = product['name']
                    if product_name not in yearly_data[year_key]:
                        yearly_data[year_key][product_name] = 0
                    
                    cost_per_unit = product['price']
                    total_cost = product_usage['quantity'] * cost_per_unit
                    yearly_data[year_key][product_name] += total_cost
        
        return jsonify(yearly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-mensual-locacion', methods=['GET'])
def get_monthly_consumption_by_location():
    """Gráfico de consumo mensual por locación"""
    try:
        from datetime import datetime
        monthly_data = {}
        
        for movement in movements:
            if movement['type'] == 'uso':
                date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
                month_key = date.strftime('%Y-%m')
                location_name = movement.get('location', 'Sin locación')
                
                if month_key not in monthly_data:
                    monthly_data[month_key] = {}
                
                if location_name not in monthly_data[month_key]:
                    monthly_data[month_key][location_name] = 0
                
                monthly_data[month_key][location_name] += movement.get('cost', 0)
        
        return jsonify(monthly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gasto-mensual-locacion', methods=['GET'])
def get_monthly_expense_by_location():
    """Gráfico de gasto mensual por locación"""
    try:
        from datetime import datetime
        monthly_data = {}
        
        for movement in movements:
            date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
            month_key = date.strftime('%Y-%m')
            location_name = movement.get('location', 'Sin locación')
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {}
            
            if location_name not in monthly_data[month_key]:
                monthly_data[month_key][location_name] = 0
            
            monthly_data[month_key][location_name] += movement.get('cost', 0)
        
        return jsonify(monthly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/consumo-anual-locacion', methods=['GET'])
def get_yearly_consumption_by_location():
    """Gráfico de consumo anual por locación"""
    try:
        from datetime import datetime
        yearly_data = {}
        
        for movement in movements:
            if movement['type'] == 'uso':
                date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
                year_key = str(date.year)
                location_name = movement.get('location', 'Sin locación')
                
                if year_key not in yearly_data:
                    yearly_data[year_key] = {}
                
                if location_name not in yearly_data[year_key]:
                    yearly_data[year_key][location_name] = 0
                
                yearly_data[year_key][location_name] += movement.get('cost', 0)
        
        return jsonify(yearly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graficos/gasto-anual-locacion', methods=['GET'])
def get_yearly_expense_by_location():
    """Gráfico de gasto anual por locación"""
    try:
        from datetime import datetime
        yearly_data = {}
        
        for movement in movements:
            date = datetime.fromisoformat(movement['date'].replace('Z', '+00:00'))
            year_key = str(date.year)
            location_name = movement.get('location', 'Sin locación')
            
            if year_key not in yearly_data:
                yearly_data[year_key] = {}
            
            if location_name not in yearly_data[year_key]:
                yearly_data[year_key][location_name] = 0
            
            yearly_data[year_key][location_name] += movement.get('cost', 0)
        
        return jsonify(yearly_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para funcionalidades de ciclos de etapas
@app.route('/api/etapas/<int:stage_id>/finalizar', methods=['POST'])
def complete_stage(stage_id):
    """Marcar etapa como completada"""
    try:
        stage = next((s for s in stages if s["id"] == stage_id), None)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        stage['is_completed'] = True
        stage['end_time'] = datetime.now().isoformat()
        stage['status'] = 'completed'
        
        return jsonify(stage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>/reiniciar', methods=['POST'])
def restart_stage(stage_id):
    """Reiniciar etapa para nuevo ciclo"""
    try:
        data = request.get_json()
        stage = next((s for s in stages if s["id"] == stage_id), None)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        # Crear nueva etapa basada en la anterior
        global next_stage_id
        new_cycle_name = data.get('cycle_name', f"{stage['name']} - Ciclo {next_stage_id}")
        
        new_stage = {
            "id": next_stage_id,
            "name": stage['name'],
            "description": stage['description'],
            "location_id": stage['location_id'],
            "expected_duration": stage['expected_duration'],
            "start_time": None,
            "end_time": None,
            "actual_duration": None,
            "status": "pending",
            "responsible": stage['responsible'],
            "created_at": datetime.now().isoformat(),
            "cycle_name": new_cycle_name,
            "is_completed": False,
            "parent_stage_id": stage_id  # Referencia a la etapa original
        }
        
        stages.append(new_stage)
        next_stage_id += 1
        
        return jsonify(new_stage), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etapas/<int:stage_id>/resumen', methods=['GET'])
def get_stage_summary(stage_id):
    """Generar resumen de etapa completada"""
    try:
        stage = next((s for s in stages if s["id"] == stage_id), None)
        if not stage:
            return jsonify({"error": "Etapa no encontrada"}), 404
        
        if not stage.get('is_completed', False):
            return jsonify({"error": "La etapa debe estar completada para generar resumen"}), 400
        
        # Obtener sub-etapas de esta etapa
        stage_substages = [s for s in substages if s['stage_id'] == stage_id]
        
        # Obtener movimientos de esta etapa
        stage_movements = [m for m in movements if m.get('stage_id') == stage_id]
        
        # Calcular consumo por producto en cada sub-etapa
        consumption_by_substage = {}
        total_quantity = 0
        total_cost = 0
        
        for substage in stage_substages:
            substage_name = substage['name']
            consumption_by_substage[substage_name] = {}
            
            substage_movements = [m for m in stage_movements if m.get('substage_id') == substage['id']]
            
            for movement in substage_movements:
                for product_usage in movement['products']:
                    product = get_product_by_id(product_usage['product_id'])
                    if product:
                        product_name = product['name']
                        if product_name not in consumption_by_substage[substage_name]:
                            consumption_by_substage[substage_name][product_name] = {
                                'quantity': 0,
                                'unit': product['unit'],
                                'cost': 0
                            }
                        
                        consumption_by_substage[substage_name][product_name]['quantity'] += product_usage['quantity']
                        cost = product_usage['quantity'] * product['price']
                        consumption_by_substage[substage_name][product_name]['cost'] += cost
                        
                        total_quantity += product_usage['quantity']
                        total_cost += cost
        
        summary = {
            "stage_id": stage_id,
            "stage_name": stage['name'],
            "cycle_name": stage.get('cycle_name', ''),
            "start_time": stage.get('start_time'),
            "end_time": stage.get('end_time'),
            "expected_duration": stage['expected_duration'],
            "actual_duration": stage.get('actual_duration'),
            "responsible": stage['responsible'],
            "consumption_by_substage": consumption_by_substage,
            "totals": {
                "total_quantity": total_quantity,
                "total_cost": total_cost
            },
            "generated_at": datetime.now().isoformat()
        }
        
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para Post-it (mantenidos del código original)
@app.route('/api/postits', methods=['GET'])
def get_postits():
    return jsonify(postits)

@app.route('/api/postits', methods=['POST'])
def create_postit():
    global next_postit_id
    try:
        data = request.get_json()
        
        if not data.get('title') or not data.get('content'):
            return jsonify({"error": "Título y contenido son obligatorios"}), 400
        
        new_postit = {
            "id": next_postit_id,
            "title": data['title'],
            "content": data['content'],
            "color": data.get('color', '#ffeb3b'),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        postits.append(new_postit)
        next_postit_id += 1
        
        return jsonify(new_postit), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/postits/<int:postit_id>', methods=['PUT'])
def update_postit(postit_id):
    try:
        data = request.get_json()
        postit = next((p for p in postits if p["id"] == postit_id), None)
        
        if not postit:
            return jsonify({"error": "Post-it no encontrado"}), 404
        
        if 'title' in data:
            postit['title'] = data['title']
        if 'content' in data:
            postit['content'] = data['content']
        if 'color' in data:
            postit['color'] = data['color']
        
        postit['updated_at'] = datetime.now().isoformat()
        
        return jsonify(postit)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/postits/<int:postit_id>', methods=['DELETE'])
def delete_postit(postit_id):
    global postits
    try:
        postit = next((p for p in postits if p["id"] == postit_id), None)
        if not postit:
            return jsonify({"error": "Post-it no encontrado"}), 404
        
        postits = [p for p in postits if p['id'] != postit_id]
        return jsonify({"message": "Post-it eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para recetas (mantenidos del código original)
@app.route('/api/recetas', methods=['GET'])
def get_recipes():
    return jsonify(recipes)

@app.route('/api/recetas/upload', methods=['POST'])
def upload_recipe():
    global next_recipe_id
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No se encontró archivo"}), 400
        
        file = request.files['file']
        name = request.form.get('name', '')
        
        if file.filename == '':
            return jsonify({"error": "No se seleccionó archivo"}), 400
        
        if not name:
            return jsonify({"error": "Nombre es obligatorio"}), 400
        
        if file and allowed_file(file.filename):
            # Generar nombre único
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'recipes', unique_filename)
            
            file.save(file_path)
            
            new_recipe = {
                "id": next_recipe_id,
                "name": name,
                "filename": file.filename,
                "file_type": file_extension,
                "file_path": f"uploads/recipes/{unique_filename}",
                "uploaded_at": datetime.now().isoformat()
            }
            
            recipes.append(new_recipe)
            next_recipe_id += 1
            
            return jsonify(new_recipe), 201
        else:
            return jsonify({"error": "Tipo de archivo no permitido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recetas/<int:recipe_id>/download', methods=['GET'])
def download_recipe(recipe_id):
    try:
        recipe = next((r for r in recipes if r["id"] == recipe_id), None)
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        
        return send_file(recipe['file_path'], as_attachment=True, download_name=recipe['filename'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recetas/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    global recipes
    try:
        recipe = next((r for r in recipes if r["id"] == recipe_id), None)
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        
        # Eliminar archivo físico
        if os.path.exists(recipe['file_path']):
            os.remove(recipe['file_path'])
        
        recipes = [r for r in recipes if r['id'] != recipe_id]
        return jsonify({"message": "Receta eliminada correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoints para imágenes de recetas
@app.route('/api/recetas/imagenes', methods=['GET'])
def get_recipe_images():
    return jsonify(recipe_images)

@app.route('/api/recetas/imagenes/upload', methods=['POST'])
def upload_recipe_image():
    global next_recipe_image_id
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No se encontró imagen"}), 400
        
        file = request.files['image']
        title = request.form.get('title', '')
        comment = request.form.get('comment', '')
        
        if file.filename == '':
            return jsonify({"error": "No se seleccionó imagen"}), 400
        
        if not title:
            return jsonify({"error": "Título es obligatorio"}), 400
        
        if file and allowed_file(file.filename):
            # Generar nombre único
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'images', unique_filename)
            
            file.save(file_path)
            
            new_image = {
                "id": next_recipe_image_id,
                "title": title,
                "filename": file.filename,
                "file_path": f"uploads/images/{unique_filename}",
                "comment": comment,
                "uploaded_at": datetime.now().isoformat()
            }
            
            recipe_images.append(new_image)
            next_recipe_image_id += 1
            
            return jsonify(new_image), 201
        else:
            return jsonify({"error": "Tipo de archivo no permitido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recetas/imagenes/<int:image_id>', methods=['PUT'])
def update_recipe_image(image_id):
    try:
        data = request.get_json()
        image = next((img for img in recipe_images if img["id"] == image_id), None)
        
        if not image:
            return jsonify({"error": "Imagen no encontrada"}), 404
        
        if 'title' in data:
            image['title'] = data['title']
        if 'comment' in data:
            image['comment'] = data['comment']
        
        return jsonify(image)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recetas/imagenes/<int:image_id>', methods=['DELETE'])
def delete_recipe_image(image_id):
    global recipe_images
    try:
        image = next((img for img in recipe_images if img["id"] == image_id), None)
        if not image:
            return jsonify({"error": "Imagen no encontrada"}), 404
        
        # Eliminar archivo físico
        if os.path.exists(image['file_path']):
            os.remove(image['file_path'])
        
        recipe_images = [img for img in recipe_images if img['id'] != image_id]
        return jsonify({"message": "Imagen eliminada correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== ENDPOINTS PARA RESPONSABLES =====

@app.route('/api/responsables', methods=['GET'])
def get_responsibles():
    return jsonify(location_responsibles)

@app.route('/api/responsables', methods=['POST'])
def create_responsible():
    global next_responsible_id, location_responsibles
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        if not data.get('name') or not data.get('location_id'):
            return jsonify({"error": "Nombre y locación son requeridos"}), 400
        
        # Verificar que la locación existe
        location = next((loc for loc in locations if loc["id"] == data['location_id']), None)
        if not location:
            return jsonify({"error": "Locación no encontrada"}), 404
        
        # Colores disponibles para responsables
        colors = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#f44336", "#00bcd4", "#795548", "#607d8b"]
        
        new_responsible = {
            "id": next_responsible_id,
            "name": data['name'],
            "role": data.get('role', 'Responsable'),
            "location_id": data['location_id'],
            "color": data.get('color', colors[next_responsible_id % len(colors)]),
            "created_at": datetime.now().isoformat()
        }
        
        location_responsibles.append(new_responsible)
        next_responsible_id += 1
        
        return jsonify(new_responsible), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/responsables/<int:responsible_id>', methods=['PUT'])
def update_responsible(responsible_id):
    global location_responsibles
    try:
        data = request.get_json()
        responsible = next((resp for resp in location_responsibles if resp["id"] == responsible_id), None)
        
        if not responsible:
            return jsonify({"error": "Responsable no encontrado"}), 404
        
        # Actualizar campos
        if 'name' in data:
            responsible['name'] = data['name']
        if 'role' in data:
            responsible['role'] = data['role']
        if 'color' in data:
            responsible['color'] = data['color']
        if 'location_id' in data:
            # Verificar que la nueva locación existe
            location = next((loc for loc in locations if loc["id"] == data['location_id']), None)
            if not location:
                return jsonify({"error": "Locación no encontrada"}), 404
            responsible['location_id'] = data['location_id']
        
        return jsonify(responsible)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/responsables/<int:responsible_id>', methods=['DELETE'])
def delete_responsible(responsible_id):
    global location_responsibles
    try:
        responsible = next((resp for resp in location_responsibles if resp["id"] == responsible_id), None)
        if not responsible:
            return jsonify({"error": "Responsable no encontrado"}), 404
        
        location_responsibles = [resp for resp in location_responsibles if resp['id'] != responsible_id]
        return jsonify({"message": "Responsable eliminado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/responsables/locacion/<int:location_id>', methods=['GET'])
def get_responsibles_by_location(location_id):
    responsibles = [resp for resp in location_responsibles if resp['location_id'] == location_id]
    return jsonify(responsibles)

# Servir imágenes estáticas
@app.route('/uploads/images/<filename>')
def uploaded_image(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'images'), filename)

# Endpoint para exportar a Excel
@app.route('/api/exportar-excel', methods=['GET'])
def export_excel():
    try:
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Productos
            products_df = pd.DataFrame(products)
            products_df.to_excel(writer, sheet_name='Productos', index=False)
            
            # Locaciones
            locations_df = pd.DataFrame(locations)
            locations_df.to_excel(writer, sheet_name='Locaciones', index=False)
            
            # Etapas
            stages_df = pd.DataFrame(stages)
            stages_df.to_excel(writer, sheet_name='Etapas', index=False)
            
            # Sub-etapas
            substages_df = pd.DataFrame(substages)
            substages_df.to_excel(writer, sheet_name='Sub-etapas', index=False)
            
            # Movimientos
            movements_df = pd.DataFrame(movements)
            movements_df.to_excel(writer, sheet_name='Movimientos', index=False)
            
            # Post-it
            postits_df = pd.DataFrame(postits)
            postits_df.to_excel(writer, sheet_name='Post-it', index=False)
            
            # Recetas
            recipes_df = pd.DataFrame(recipes)
            recipes_df.to_excel(writer, sheet_name='Recetas', index=False)
            
            # Imágenes
            images_df = pd.DataFrame(recipe_images)
            images_df.to_excel(writer, sheet_name='Imagenes', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'inventario_cultivo_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

