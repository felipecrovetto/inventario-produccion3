# Aplicación de Gestión de Inventario para Cultivo

## Descripción
Aplicación web completa para la gestión de inventario en procesos de cultivo, desarrollada con Flask (backend) y HTML/CSS/JavaScript puro (frontend).

## Características Principales

### ✅ Funcionalidades Implementadas
- **Gestión de Productos**: CRUD completo con precios y control de stock
- **Gestión de Locaciones**: Organización por ubicaciones físicas
- **Gestión de Etapas y Sub-Etapas**: Control de procesos con tiempos esperados vs reales
- **Registro de Movimientos**: Uso, compra y transferencias entre locaciones
- **Sistema de Alertas**: Notificaciones automáticas de stock bajo/crítico
- **Gráficos Interactivos**: Análisis visual de consumo, gastos y tiempos
- **Exportación Excel**: Descarga de todos los datos en formato Excel

### 📊 Gráficos y Análisis
- Consumo por producto (con unidades específicas)
- Stock actual vs mínimo
- Consumo por locación y etapa
- Gastos por etapa y locación
- Tiempo real vs esperado (etapas y sub-etapas)
- Barras de progreso automáticas para tiempos

### 🔧 Correcciones Implementadas
- **Stock correcto**: Las compras se suman correctamente al inventario
- **Eliminación lógica**: Restricciones para mantener integridad de datos
- **Formularios mejorados**: Dropdowns dinámicos para locaciones y sub-etapas
- **Transferencias**: Nuevo formulario para mover stock entre locaciones
- **Gráficos corregidos**: Endpoints API funcionando correctamente

## Estructura del Proyecto

```
flask-inventory-fixed/
├── main.py                 # Backend Flask completo
├── requirements.txt        # Dependencias Python
├── Procfile               # Configuración Heroku
├── runtime.txt            # Versión Python
├── .gitignore             # Archivos ignorados
├── templates/
│   └── index.html         # Frontend HTML completo
├── static/
│   ├── style.css          # Estilos CSS modernos
│   └── app.js             # JavaScript con todas las funcionalidades
└── README.md              # Esta documentación
```

## Tecnologías Utilizadas

### Backend
- **Flask 2.3.3**: Framework web Python
- **Flask-CORS 4.0.0**: Manejo de CORS
- **Pandas 1.5.3**: Análisis de datos y exportación Excel
- **NumPy 1.24.4**: Operaciones numéricas
- **OpenPyXL 3.1.2**: Generación de archivos Excel

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con variables CSS y diseño responsive
- **JavaScript ES6+**: Lógica del frontend sin frameworks
- **Chart.js**: Gráficos interactivos (desde CDN)

## Instalación y Uso

### Requisitos Previos
- Python 3.11.0
- pip (gestor de paquetes Python)

### Instalación Local
```bash
# Clonar o descargar el proyecto
cd flask-inventory-fixed

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar la aplicación
python main.py

# Abrir en el navegador
http://localhost:5001
```

### Despliegue en Heroku
```bash
# Inicializar repositorio Git
git init
git add .
git commit -m "Initial commit"

# Crear aplicación en Heroku
heroku create mi-app-inventario

# Desplegar
git push heroku main

# Abrir aplicación
heroku open
```

## Funcionalidades Detalladas

### Dashboard
- KPIs principales (productos, etapas, locaciones, costos)
- Alertas de stock bajo/crítico
- Todos los gráficos de análisis en una vista

### Productos
- Formulario con precio obligatorio
- Control de stock automático
- Estados visuales (normal, bajo, crítico)
- Gráficos específicos de productos

### Etapas y Sub-Etapas
- Asociación con locaciones
- Tiempos esperados vs reales
- Botones de inicio/finalización
- Estados automáticos (pendiente, en progreso, completada)
- Gráficos de tiempo comparativo

### Movimientos
- Registro de uso con validación de stock
- Registro de compras con actualización automática
- Transferencias entre locaciones
- Cálculo automático de costos
- Filtros avanzados

### Locaciones
- Gestión completa de ubicaciones
- Gráficos de consumo y gastos por locación
- Análisis de tiempos por ubicación

## API Endpoints

### Productos
- `GET /api/productos` - Listar productos
- `POST /api/productos` - Crear producto
- `PUT /api/productos/<id>` - Actualizar producto
- `DELETE /api/productos/<id>` - Eliminar producto

### Etapas
- `GET /api/etapas` - Listar etapas
- `POST /api/etapas` - Crear etapa
- `PUT /api/etapas/<id>` - Actualizar etapa
- `DELETE /api/etapas/<id>` - Eliminar etapa
- `POST /api/etapas/<id>/iniciar` - Iniciar etapa
- `POST /api/etapas/<id>/finalizar` - Finalizar etapa

### Sub-Etapas
- `GET /api/sub-etapas` - Listar sub-etapas
- `POST /api/sub-etapas` - Crear sub-etapa
- `PUT /api/sub-etapas/<id>` - Actualizar sub-etapa
- `DELETE /api/sub-etapas/<id>` - Eliminar sub-etapa
- `POST /api/sub-etapas/<id>/iniciar` - Iniciar sub-etapa
- `POST /api/sub-etapas/<id>/finalizar` - Finalizar sub-etapa

### Locaciones
- `GET /api/locaciones` - Listar locaciones
- `POST /api/locaciones` - Crear locación
- `PUT /api/locaciones/<id>` - Actualizar locación
- `DELETE /api/locaciones/<id>` - Eliminar locación

### Movimientos
- `GET /api/movimientos` - Listar movimientos
- `POST /api/movimientos` - Crear movimiento
- `PUT /api/movimientos/<id>` - Actualizar movimiento
- `DELETE /api/movimientos/<id>` - Eliminar movimiento
- `POST /api/transferencias` - Crear transferencia

### Gráficos
- `GET /api/graficos/consumo-producto` - Consumo por producto
- `GET /api/graficos/consumo-locacion` - Consumo por locación
- `GET /api/graficos/consumo-etapa` - Consumo por etapa
- `GET /api/graficos/gastos-etapa` - Gastos por etapa
- `GET /api/graficos/gastos-locacion` - Gastos por locación
- `GET /api/graficos/tiempo-etapas` - Tiempo etapas
- `GET /api/graficos/tiempo-sub-etapas` - Tiempo sub-etapas
- `GET /api/graficos/tiempo-locacion` - Tiempo por locación
- `GET /api/graficos/stock-productos` - Stock vs mínimo

### Otros
- `GET /api/dashboard` - Datos del dashboard
- `GET /api/exportar-excel` - Exportar datos a Excel

## Características Técnicas

### Validaciones
- Stock suficiente para movimientos de uso
- Restricciones de eliminación para mantener integridad
- Validación de precios y cantidades
- Formularios con validación client-side y server-side

### Responsive Design
- Diseño optimizado para desktop y móvil
- Navegación adaptativa
- Tablas con scroll horizontal en móviles
- Formularios optimizados para touch

### Seguridad
- Validación de datos en backend
- Sanitización de inputs
- Manejo de errores robusto
- CORS configurado correctamente

## Datos de Ejemplo
La aplicación incluye datos de ejemplo precargados:
- 4 productos con diferentes unidades
- 3 locaciones (invernaderos y área de secado)
- 3 etapas con sub-etapas asociadas
- Movimientos de ejemplo (compras y usos)

## Soporte y Mantenimiento
- Código bien documentado y estructurado
- Arquitectura modular y escalable
- Base de datos en memoria (fácil migración a PostgreSQL)
- Logs y manejo de errores implementado

## Versión
1.0.0 - Versión completa con todas las funcionalidades solicitadas

