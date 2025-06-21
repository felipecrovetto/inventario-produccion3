from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
import io
import pandas as pd
from decimal import Decimal

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos en memoria
locations = [
    {"id": 1, "name": "Invernadero Principal", "description": "Invernadero principal para cultivo", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Invernadero Secundario", "description": "Invernadero secundario para propagación", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Área de Secado", "description": "Área especializada para secado y curado", "created_at": "2024-01-01T00:00:00"}
]

products = [
    {"id": 1, "name": "Fertilizante NPK", "unit": "kg", "initial_stock": 25, "current_stock": 70, "min_stock": 5, "price": 15.50, "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Sustrato Coco", "unit": "kg", "initial_stock": 50, "current_stock": 50, "min_stock": 10, "price": 8.75, "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Semillas Tomate", "unit": "unidades", "initial_stock": 100, "current_stock": 100, "min_stock": 20, "price": 0.25, "created_at": "2024-01-01T00:00:00"},
    {"id": 4, "name": "Agua pH 6.5", "unit": "l", "initial_stock": 20, "current_stock": 8, "min_stock": 15, "price": 1.20, "created_at": "2024-01-01T00:00:00"}
]

stages = [
    {"id": 1, "name": "Germinación", "duration": 7, "description": "Proceso inicial de germinación de semillas", "location_id": 2, "expected_duration": 7, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Crecimiento", "duration": 30, "description": "Fase de crecimiento vegetativo", "location_id": 1, "expected_duration": 30, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Floración", "duration": 45, "description": "Etapa de floración y fructificación", "location_id": 1, "expected_duration": 45, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"}
]

substages = [
    {"id": 1, "name": "Preparación de semillas", "duration": 2, "description": "Preparación y acondicionamiento de semillas", "stage_id": 1, "expected_duration": 2, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Siembra", "duration": 5, "description": "Proceso de siembra en sustrato", "stage_id": 1, "expected_duration": 5, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"},
    {"id": 3, "name": "Crecimiento inicial", "duration": 15, "description": "Primeras semanas de crecimiento", "stage_id": 2, "expected_duration": 15, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"},
    {"id": 4, "name": "Desarrollo vegetativo", "duration": 15, "description": "Desarrollo completo de la planta", "stage_id": 2, "expected_duration": 15, "start_time": None, "end_time": None, "actual_duration": None, "status": "pending", "created_at": "2024-01-01T00:00:00"}
]

movements = [
    {"id": 1, "date": "2024-01-15T10:30:00", "type": "compra", "products": [{"product_id": 1, "quantity": 50, "unit": "kg"}], "stage_id": None, "substage_id": None, "responsible": "Juan Pérez", "location": "Invernadero Principal", "observations": "Compra inicial de fertilizante", "cost": 775.00},
    {"id": 2, "date": "2024-01-20T08:15:00", "type": "uso", "products": [{"product_id": 1, "quantity": 5, "unit": "kg"}], "stage_id": 2, "substage_id": 3, "responsible": "María García", "location": "Invernadero Principal", "observations": "Aplicación de fertilizante en crecimiento inicial", "cost": 77.50},
    {"id": 3, "date": "2024-02-10T14:20:00", "type": "uso", "products": [{"product_id": 4, "quantity": 12, "unit": "l"}], "stage_id": 1, "substage_id": 2, "responsible": "Carlos López", "location": "Invernadero Secundario", "observations": "Riego durante siembra", "cost": 14.40}
]

# Contadores para IDs
next_location_id = 4
next_product_id = 5
next_stage_id = 4
next_substage_id = 5
next_movement_id = 4

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

def update_stock(product_id, quantity, operation):
    """Actualiza el stock de un producto"""
    product = get_product_by_id(product_id)
    if product:
        if operation == "add":
            product["current_stock"] += quantity
        elif operation == "subtract":
            product["current_stock"] -= quantity
        return True
    return False

def can_delete_location(location_id):
    """Verifica si una locación puede ser eliminada (no tiene etapas asociadas)"""
    return not any(stage["location_id"] == location_id for stage in stages)

def can_delete_stage(stage_id):
    """Verifica si una etapa puede ser eliminada (no tiene sub-etapas asociadas)"""
    return not any(substage["stage_id"] == stage_id for substage in substages)

def can_delete_substage(substage_id):
    """Verifica si una sub-etapa puede ser eliminada (no tiene registros de uso)"""
    return not any(
        movement["type"] == "uso" and movement.get("substage_id") == substage_id 
        for movement in movements
    )

def has_usage_records(product_id):
    """Verifica si un producto tiene registros de uso"""
    return any(
        movement["type"] == "uso" and 
        any(prod["product_id"] == product_id for prod in movement["products"])
        for movement in movements
    )

@app.route('/')
def index():
    return render_template('index.html')

# Endpoints para Locaciones
@app.route('/api/locaciones', methods=['GET'])
def get_locations():
    return jsonify(locations)

@app.route('/api/locaciones', methods=['POST'])
def create_location():
    global next_location_id
    data = request.json
    
    new_location = {
        "id": next_location_id,
        "name": data["name"],
        "description": data.get("description", ""),
        "created_at": datetime.now().isoformat()
    }
    
    locations.append(new_location)
    next_location_id += 1
    
    return jsonify(new_location), 201

@app.route('/api/locaciones/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    data = request.json
    location = next((loc for loc in locations if loc["id"] == location_id), None)
    
    if not location:
        return jsonify({"error": "Locación no encontrada"}), 404
    
    location["name"] = data.get("name", location["name"])
    location["description"] = data.get("description", location["description"])
    
    return jsonify(location)

@app.route('/api/locaciones/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    if not can_delete_location(location_id):
        return jsonify({"error": "No se puede eliminar la locación porque tiene etapas asociadas"}), 400
    
    global locations
    locations = [loc for loc in locations if loc["id"] != location_id]
    return jsonify({"message": "Locación eliminada correctamente"})

# Endpoints para Productos
@app.route('/api/productos', methods=['GET'])
def get_products():
    return jsonify(products)

@app.route('/api/productos', methods=['POST'])
def create_product():
    global next_product_id
    data = request.json
    
    # Validar que el precio sea válido
    try:
        price = float(data.get("price", 0))
        if price < 0:
            return jsonify({"error": "El precio no puede ser negativo"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "El precio debe ser un número válido"}), 400
    
    new_product = {
        "id": next_product_id,
        "name": data["name"],
        "unit": data["unit"],
        "initial_stock": float(data["initial_stock"]),
        "current_stock": float(data["initial_stock"]),
        "min_stock": float(data["min_stock"]),
        "price": price,
        "created_at": datetime.now().isoformat()
    }
    
    products.append(new_product)
    next_product_id += 1
    
    return jsonify(new_product), 201

@app.route('/api/productos/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    product = get_product_by_id(product_id)
    
    if not product:
        return jsonify({"error": "Producto no encontrado"}), 404
    
    # Validar precio si se proporciona
    if "price" in data:
        try:
            price = float(data["price"])
            if price < 0:
                return jsonify({"error": "El precio no puede ser negativo"}), 400
            product["price"] = price
        except (ValueError, TypeError):
            return jsonify({"error": "El precio debe ser un número válido"}), 400
    
    product["name"] = data.get("name", product["name"])
    product["unit"] = data.get("unit", product["unit"])
    product["min_stock"] = float(data.get("min_stock", product["min_stock"]))
    
    return jsonify(product)

@app.route('/api/productos/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    if has_usage_records(product_id):
        return jsonify({"error": "No se puede eliminar el producto porque tiene registros de uso"}), 400
    
    global products
    products = [prod for prod in products if prod["id"] != product_id]
    return jsonify({"message": "Producto eliminado correctamente"})

# Endpoints para Etapas
@app.route('/api/etapas', methods=['GET'])
def get_stages():
    stages_with_location = []
    for stage in stages:
        stage_copy = stage.copy()
        stage_copy["location_name"] = get_location_name(stage["location_id"])
        stages_with_location.append(stage_copy)
    return jsonify(stages_with_location)

@app.route('/api/etapas', methods=['POST'])
def create_stage():
    global next_stage_id
    data = request.json
    
    new_stage = {
        "id": next_stage_id,
        "name": data["name"],
        "duration": int(data.get("duration", 0)),
        "description": data.get("description", ""),
        "location_id": int(data["location_id"]),
        "expected_duration": int(data.get("expected_duration", data.get("duration", 0))),
        "start_time": None,
        "end_time": None,
        "actual_duration": None,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    
    stages.append(new_stage)
    next_stage_id += 1
    
    # Crear sub-etapas si se proporcionan
    if "substages" in data and data["substages"]:
        global next_substage_id
        for substage_data in data["substages"]:
            new_substage = {
                "id": next_substage_id,
                "name": substage_data["name"],
                "duration": int(substage_data.get("duration", 0)),
                "description": substage_data.get("description", ""),
                "stage_id": new_stage["id"],
                "expected_duration": int(substage_data.get("expected_duration", substage_data.get("duration", 0))),
                "start_time": None,
                "end_time": None,
                "actual_duration": None,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }
            substages.append(new_substage)
            next_substage_id += 1
    
    return jsonify(new_stage), 201

@app.route('/api/etapas/<int:stage_id>', methods=['PUT'])
def update_stage(stage_id):
    data = request.json
    stage = get_stage_by_id(stage_id)
    
    if not stage:
        return jsonify({"error": "Etapa no encontrada"}), 404
    
    stage["name"] = data.get("name", stage["name"])
    stage["duration"] = int(data.get("duration", stage["duration"]))
    stage["description"] = data.get("description", stage["description"])
    stage["location_id"] = int(data.get("location_id", stage["location_id"]))
    stage["expected_duration"] = int(data.get("expected_duration", stage["expected_duration"]))
    
    return jsonify(stage)

@app.route('/api/etapas/<int:stage_id>', methods=['DELETE'])
def delete_stage(stage_id):
    if not can_delete_stage(stage_id):
        return jsonify({"error": "No se puede eliminar la etapa porque tiene sub-etapas asociadas"}), 400
    
    global stages
    stages = [stage for stage in stages if stage["id"] != stage_id]
    return jsonify({"message": "Etapa eliminada correctamente"})

@app.route('/api/etapas/<int:stage_id>/iniciar', methods=['POST'])
def start_stage(stage_id):
    stage = get_stage_by_id(stage_id)
    
    if not stage:
        return jsonify({"error": "Etapa no encontrada"}), 404
    
    if stage["status"] != "pending":
        return jsonify({"error": "La etapa ya ha sido iniciada"}), 400
    
    stage["start_time"] = datetime.now().isoformat()
    stage["status"] = "in_progress"
    
    return jsonify(stage)

@app.route('/api/etapas/<int:stage_id>/finalizar', methods=['POST'])
def finish_stage(stage_id):
    stage = get_stage_by_id(stage_id)
    
    if not stage:
        return jsonify({"error": "Etapa no encontrada"}), 404
    
    if stage["status"] != "in_progress":
        return jsonify({"error": "La etapa debe estar en progreso para finalizarla"}), 400
    
    stage["end_time"] = datetime.now().isoformat()
    stage["status"] = "completed"
    
    # Calcular duración real
    start = datetime.fromisoformat(stage["start_time"])
    end = datetime.fromisoformat(stage["end_time"])
    stage["actual_duration"] = (end - start).days
    
    return jsonify(stage)

# Endpoints para Sub-etapas
@app.route('/api/sub-etapas', methods=['GET'])
def get_substages():
    substages_with_stage = []
    for substage in substages:
        substage_copy = substage.copy()
        stage = get_stage_by_id(substage["stage_id"])
        substage_copy["stage_name"] = stage["name"] if stage else "Desconocida"
        substages_with_stage.append(substage_copy)
    return jsonify(substages_with_stage)

@app.route('/api/sub-etapas', methods=['POST'])
def create_substage():
    global next_substage_id
    data = request.json
    
    new_substage = {
        "id": next_substage_id,
        "name": data["name"],
        "duration": int(data.get("duration", 0)),
        "description": data.get("description", ""),
        "stage_id": int(data["stage_id"]),
        "expected_duration": int(data.get("expected_duration", data.get("duration", 0))),
        "start_time": None,
        "end_time": None,
        "actual_duration": None,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    
    substages.append(new_substage)
    next_substage_id += 1
    
    return jsonify(new_substage), 201

@app.route('/api/sub-etapas/<int:substage_id>', methods=['PUT'])
def update_substage(substage_id):
    data = request.json
    substage = get_substage_by_id(substage_id)
    
    if not substage:
        return jsonify({"error": "Sub-etapa no encontrada"}), 404
    
    substage["name"] = data.get("name", substage["name"])
    substage["duration"] = int(data.get("duration", substage["duration"]))
    substage["description"] = data.get("description", substage["description"])
    substage["stage_id"] = int(data.get("stage_id", substage["stage_id"]))
    substage["expected_duration"] = int(data.get("expected_duration", substage["expected_duration"]))
    
    return jsonify(substage)

@app.route('/api/sub-etapas/<int:substage_id>', methods=['DELETE'])
def delete_substage(substage_id):
    if not can_delete_substage(substage_id):
        return jsonify({"error": "No se puede eliminar la sub-etapa porque tiene registros de uso"}), 400
    
    global substages
    substages = [substage for substage in substages if substage["id"] != substage_id]
    return jsonify({"message": "Sub-etapa eliminada correctamente"})

@app.route('/api/sub-etapas/<int:substage_id>/iniciar', methods=['POST'])
def start_substage(substage_id):
    substage = get_substage_by_id(substage_id)
    
    if not substage:
        return jsonify({"error": "Sub-etapa no encontrada"}), 404
    
    if substage["status"] != "pending":
        return jsonify({"error": "La sub-etapa ya ha sido iniciada"}), 400
    
    substage["start_time"] = datetime.now().isoformat()
    substage["status"] = "in_progress"
    
    return jsonify(substage)

@app.route('/api/sub-etapas/<int:substage_id>/finalizar', methods=['POST'])
def finish_substage(substage_id):
    substage = get_substage_by_id(substage_id)
    
    if not substage:
        return jsonify({"error": "Sub-etapa no encontrada"}), 404
    
    if substage["status"] != "in_progress":
        return jsonify({"error": "La sub-etapa debe estar en progreso para finalizarla"}), 400
    
    substage["end_time"] = datetime.now().isoformat()
    substage["status"] = "completed"
    
    # Calcular duración real
    start = datetime.fromisoformat(substage["start_time"])
    end = datetime.fromisoformat(substage["end_time"])
    substage["actual_duration"] = (end - start).days
    
    return jsonify(substage)

# Endpoints para Movimientos
@app.route('/api/movimientos', methods=['GET'])
def get_movements():
    movements_with_details = []
    for movement in movements:
        movement_copy = movement.copy()
        
        # Agregar nombres de etapa y sub-etapa
        if movement["stage_id"]:
            stage = get_stage_by_id(movement["stage_id"])
            movement_copy["stage_name"] = stage["name"] if stage else "Desconocida"
        else:
            movement_copy["stage_name"] = None
            
        if movement["substage_id"]:
            substage = get_substage_by_id(movement["substage_id"])
            movement_copy["substage_name"] = substage["name"] if substage else "Desconocida"
        else:
            movement_copy["substage_name"] = None
        
        # Agregar nombres de productos
        products_with_names = []
        for product_data in movement["products"]:
            product = get_product_by_id(product_data["product_id"])
            product_with_name = product_data.copy()
            product_with_name["product_name"] = product["name"] if product else "Desconocido"
            products_with_names.append(product_with_name)
        movement_copy["products"] = products_with_names
        
        movements_with_details.append(movement_copy)
    
    return jsonify(movements_with_details)

@app.route('/api/movimientos', methods=['POST'])
def create_movement():
    global next_movement_id
    data = request.json
    
    # Validar productos y calcular costo total
    total_cost = 0
    validated_products = []
    
    for product_data in data["products"]:
        product = get_product_by_id(product_data["product_id"])
        if not product:
            return jsonify({"error": f"Producto con ID {product_data['product_id']} no encontrado"}), 404
        
        quantity = float(product_data["quantity"])
        
        # Validar stock para movimientos de uso
        if data["type"] == "uso":
            if quantity > product["current_stock"]:
                return jsonify({"error": f"Stock insuficiente para {product['name']}. Disponible: {product['current_stock']} {product['unit']}"}), 400
        
        # Calcular costo
        cost = quantity * product["price"]
        total_cost += cost
        
        validated_products.append({
            "product_id": product_data["product_id"],
            "quantity": quantity,
            "unit": product_data["unit"]
        })
    
    new_movement = {
        "id": next_movement_id,
        "date": data.get("date", datetime.now().isoformat()),
        "type": data["type"],
        "products": validated_products,
        "stage_id": data.get("stage_id"),
        "substage_id": data.get("substage_id"),
        "responsible": data["responsible"],
        "location": data["location"],
        "observations": data.get("observations", ""),
        "cost": total_cost
    }
    
    # Actualizar stock
    for product_data in validated_products:
        if data["type"] == "compra":
            update_stock(product_data["product_id"], product_data["quantity"], "add")
        elif data["type"] == "uso":
            update_stock(product_data["product_id"], product_data["quantity"], "subtract")
    
    movements.append(new_movement)
    next_movement_id += 1
    
    return jsonify(new_movement), 201

@app.route('/api/movimientos/<int:movement_id>', methods=['PUT'])
def update_movement(movement_id):
    data = request.json
    movement = next((mov for mov in movements if mov["id"] == movement_id), None)
    
    if not movement:
        return jsonify({"error": "Movimiento no encontrado"}), 404
    
    # Revertir cambios de stock del movimiento original
    for product_data in movement["products"]:
        if movement["type"] == "compra":
            update_stock(product_data["product_id"], product_data["quantity"], "subtract")
        elif movement["type"] == "uso":
            update_stock(product_data["product_id"], product_data["quantity"], "add")
    
    # Validar y aplicar nuevos cambios
    total_cost = 0
    validated_products = []
    
    for product_data in data["products"]:
        product = get_product_by_id(product_data["product_id"])
        if not product:
            return jsonify({"error": f"Producto con ID {product_data['product_id']} no encontrado"}), 404
        
        quantity = float(product_data["quantity"])
        
        # Validar stock para movimientos de uso
        if data["type"] == "uso":
            if quantity > product["current_stock"]:
                return jsonify({"error": f"Stock insuficiente para {product['name']}. Disponible: {product['current_stock']} {product['unit']}"}), 400
        
        # Calcular costo
        cost = quantity * product["price"]
        total_cost += cost
        
        validated_products.append({
            "product_id": product_data["product_id"],
            "quantity": quantity,
            "unit": product_data["unit"]
        })
    
    # Actualizar movimiento
    movement["date"] = data.get("date", movement["date"])
    movement["type"] = data["type"]
    movement["products"] = validated_products
    movement["stage_id"] = data.get("stage_id")
    movement["substage_id"] = data.get("substage_id")
    movement["responsible"] = data["responsible"]
    movement["location"] = data["location"]
    movement["observations"] = data.get("observations", "")
    movement["cost"] = total_cost
    
    # Aplicar nuevos cambios de stock
    for product_data in validated_products:
        if data["type"] == "compra":
            update_stock(product_data["product_id"], product_data["quantity"], "add")
        elif data["type"] == "uso":
            update_stock(product_data["product_id"], product_data["quantity"], "subtract")
    
    return jsonify(movement)

@app.route('/api/movimientos/<int:movement_id>', methods=['DELETE'])
def delete_movement(movement_id):
    global movements
    movement = next((mov for mov in movements if mov["id"] == movement_id), None)
    
    if not movement:
        return jsonify({"error": "Movimiento no encontrado"}), 404
    
    # Revertir cambios de stock
    for product_data in movement["products"]:
        if movement["type"] == "compra":
            update_stock(product_data["product_id"], product_data["quantity"], "subtract")
        elif movement["type"] == "uso":
            update_stock(product_data["product_id"], product_data["quantity"], "add")
    
    movements = [mov for mov in movements if mov["id"] != movement_id]
    return jsonify({"message": "Movimiento eliminado correctamente"})

# Endpoint para transferencias entre locaciones
@app.route('/api/transferencias', methods=['POST'])
def create_transfer():
    global next_movement_id
    data = request.json
    
    product = get_product_by_id(data["product_id"])
    if not product:
        return jsonify({"error": "Producto no encontrado"}), 404
    
    quantity = float(data["quantity"])
    
    # Validar stock suficiente
    if quantity > product["current_stock"]:
        return jsonify({"error": f"Stock insuficiente. Disponible: {product['current_stock']} {product['unit']}"}), 400
    
    # Calcular costo de transferencia
    cost = quantity * product["price"]
    
    # Crear movimiento de transferencia
    new_transfer = {
        "id": next_movement_id,
        "date": datetime.now().isoformat(),
        "type": "transferencia",
        "products": [{
            "product_id": data["product_id"],
            "quantity": quantity,
            "unit": data["unit"]
        }],
        "stage_id": None,
        "substage_id": None,
        "responsible": data["responsible"],
        "location": f"De {data['from_location']} a {data['to_location']}",
        "observations": f"Transferencia de {quantity} {data['unit']} de {product['name']} de {data['from_location']} a {data['to_location']}",
        "cost": cost
    }
    
    movements.append(new_transfer)
    next_movement_id += 1
    
    return jsonify(new_transfer), 201

# Endpoints para Dashboard y Alertas
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    # Calcular estadísticas básicas
    total_products = len(products)
    total_stages = len(stages)
    total_locations = len(locations)
    total_movements = len(movements)
    
    # Calcular alertas de stock bajo
    low_stock_alerts = []
    for product in products:
        if product["current_stock"] <= product["min_stock"]:
            status = "crítico" if product["current_stock"] == 0 else "bajo"
            low_stock_alerts.append({
                "product_name": product["name"],
                "current_stock": product["current_stock"],
                "min_stock": product["min_stock"],
                "unit": product["unit"],
                "status": status
            })
    
    # Calcular costo total
    total_cost = sum(movement["cost"] for movement in movements)
    
    return jsonify({
        "total_products": total_products,
        "total_stages": total_stages,
        "total_locations": total_locations,
        "total_movements": total_movements,
        "low_stock_alerts": low_stock_alerts,
        "total_cost": total_cost
    })

# Endpoints para Gráficos
@app.route('/api/graficos/consumo-producto', methods=['GET'])
def get_consumption_by_product():
    consumption = {}
    
    for movement in movements:
        if movement["type"] == "uso":
            for product_data in movement["products"]:
                product = get_product_by_id(product_data["product_id"])
                if product:
                    key = f"{product['name']} ({product['unit']})"
                    if key not in consumption:
                        consumption[key] = 0
                    consumption[key] += product_data["quantity"]
    
    return jsonify(consumption)

@app.route('/api/graficos/consumo-locacion', methods=['GET'])
def get_consumption_by_location():
    consumption = {}
    
    for movement in movements:
        if movement["type"] == "uso":
            location = movement["location"]
            if location not in consumption:
                consumption[location] = {}
            
            for product_data in movement["products"]:
                product = get_product_by_id(product_data["product_id"])
                if product:
                    key = f"{product['name']} ({product['unit']})"
                    if key not in consumption[location]:
                        consumption[location][key] = 0
                    consumption[location][key] += product_data["quantity"]
    
    return jsonify(consumption)

@app.route('/api/graficos/consumo-etapa', methods=['GET'])
def get_consumption_by_stage():
    consumption = {}
    
    for movement in movements:
        if movement["type"] == "uso" and movement.get("stage_id"):
            stage = get_stage_by_id(movement["stage_id"])
            if stage:
                stage_name = stage["name"]
                if stage_name not in consumption:
                    consumption[stage_name] = {}
                
                for product_data in movement["products"]:
                    product = get_product_by_id(product_data["product_id"])
                    if product:
                        key = f"{product['name']} ({product['unit']})"
                        if key not in consumption[stage_name]:
                            consumption[stage_name][key] = 0
                        consumption[stage_name][key] += product_data["quantity"]
    
    return jsonify(consumption)

@app.route('/api/graficos/gastos-etapa', methods=['GET'])
def get_expenses_by_stage():
    expenses = {}
    
    for movement in movements:
        if movement["type"] == "uso" and movement.get("stage_id"):
            stage = get_stage_by_id(movement["stage_id"])
            if stage:
                stage_name = stage["name"]
                if stage_name not in expenses:
                    expenses[stage_name] = 0
                expenses[stage_name] += movement["cost"]
    
    return jsonify(expenses)

@app.route('/api/graficos/gastos-locacion', methods=['GET'])
def get_expenses_by_location():
    expenses = {}
    
    for movement in movements:
        if movement["type"] == "uso":
            location = movement["location"]
            if location not in expenses:
                expenses[location] = 0
            expenses[location] += movement["cost"]
    
    return jsonify(expenses)

@app.route('/api/graficos/tiempo-etapas', methods=['GET'])
def get_stage_time_comparison():
    stage_times = []
    
    for stage in stages:
        if stage["start_time"]:
            expected = stage["expected_duration"]
            
            if stage["status"] == "completed" and stage["actual_duration"] is not None:
                actual = stage["actual_duration"]
            elif stage["status"] == "in_progress":
                # Calcular tiempo transcurrido
                start = datetime.fromisoformat(stage["start_time"])
                actual = (datetime.now() - start).days
            else:
                actual = 0
            
            stage_times.append({
                "name": stage["name"],
                "expected": expected,
                "actual": actual,
                "status": stage["status"]
            })
    
    return jsonify(stage_times)

@app.route('/api/graficos/tiempo-sub-etapas', methods=['GET'])
def get_substage_time_comparison():
    substage_times = []
    
    for substage in substages:
        if substage["start_time"]:
            expected = substage["expected_duration"]
            
            if substage["status"] == "completed" and substage["actual_duration"] is not None:
                actual = substage["actual_duration"]
            elif substage["status"] == "in_progress":
                # Calcular tiempo transcurrido
                start = datetime.fromisoformat(substage["start_time"])
                actual = (datetime.now() - start).days
            else:
                actual = 0
            
            substage_times.append({
                "name": substage["name"],
                "expected": expected,
                "actual": actual,
                "status": substage["status"]
            })
    
    return jsonify(substage_times)

@app.route('/api/graficos/tiempo-locacion', methods=['GET'])
def get_location_time_comparison():
    location_times = {}
    
    # Agrupar etapas por locación
    for stage in stages:
        if stage["start_time"]:
            location_name = get_location_name(stage["location_id"])
            if location_name not in location_times:
                location_times[location_name] = {"expected": 0, "actual": 0}
            
            expected = stage["expected_duration"]
            location_times[location_name]["expected"] += expected
            
            if stage["status"] == "completed" and stage["actual_duration"] is not None:
                actual = stage["actual_duration"]
            elif stage["status"] == "in_progress":
                start = datetime.fromisoformat(stage["start_time"])
                actual = (datetime.now() - start).days
            else:
                actual = 0
            
            location_times[location_name]["actual"] += actual
    
    return jsonify(location_times)

@app.route('/api/graficos/stock-productos', methods=['GET'])
def get_stock_vs_minimum():
    stock_data = []
    
    for product in products:
        stock_data.append({
            "name": f"{product['name']} ({product['unit']})",
            "current_stock": product["current_stock"],
            "min_stock": product["min_stock"],
            "unit": product["unit"]
        })
    
    return jsonify(stock_data)

# Endpoint para exportar a Excel
@app.route('/api/exportar-excel', methods=['GET'])
def export_to_excel():
    try:
        # Crear un archivo Excel en memoria
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Hoja de productos
            products_df = pd.DataFrame(products)
            products_df.to_excel(writer, sheet_name='Productos', index=False)
            
            # Hoja de etapas
            stages_with_location = []
            for stage in stages:
                stage_copy = stage.copy()
                stage_copy["location_name"] = get_location_name(stage["location_id"])
                stages_with_location.append(stage_copy)
            stages_df = pd.DataFrame(stages_with_location)
            stages_df.to_excel(writer, sheet_name='Etapas', index=False)
            
            # Hoja de sub-etapas
            substages_with_stage = []
            for substage in substages:
                substage_copy = substage.copy()
                stage = get_stage_by_id(substage["stage_id"])
                substage_copy["stage_name"] = stage["name"] if stage else "Desconocida"
                substages_with_stage.append(substage_copy)
            substages_df = pd.DataFrame(substages_with_stage)
            substages_df.to_excel(writer, sheet_name='Sub-etapas', index=False)
            
            # Hoja de movimientos
            movements_with_details = []
            for movement in movements:
                movement_copy = movement.copy()
                
                # Agregar nombres de etapa y sub-etapa
                if movement["stage_id"]:
                    stage = get_stage_by_id(movement["stage_id"])
                    movement_copy["stage_name"] = stage["name"] if stage else "Desconocida"
                else:
                    movement_copy["stage_name"] = None
                    
                if movement["substage_id"]:
                    substage = get_substage_by_id(movement["substage_id"])
                    movement_copy["substage_name"] = substage["name"] if substage else "Desconocida"
                else:
                    movement_copy["substage_name"] = None
                
                # Simplificar productos para Excel
                products_text = ", ".join([
                    f"{get_product_by_id(p['product_id'])['name'] if get_product_by_id(p['product_id']) else 'Desconocido'}: {p['quantity']} {p['unit']}"
                    for p in movement["products"]
                ])
                movement_copy["products_text"] = products_text
                del movement_copy["products"]  # Remover la lista compleja
                
                movements_with_details.append(movement_copy)
            
            movements_df = pd.DataFrame(movements_with_details)
            movements_df.to_excel(writer, sheet_name='Movimientos', index=False)
            
            # Hoja de locaciones
            locations_df = pd.DataFrame(locations)
            locations_df.to_excel(writer, sheet_name='Locaciones', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'inventario_cultivo_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    
    except Exception as e:
        return jsonify({"error": f"Error al generar el archivo Excel: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

