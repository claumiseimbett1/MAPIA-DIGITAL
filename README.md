Mapia Digital - Backend API
Sistema de procesamiento de datos geoespaciales agrícolas.
🚀 Instalación
bash# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt
▶️ Ejecutar Backend
bashpython mapia_backend.py
API disponible en: http://localhost:8000
Docs interactivas: http://localhost:8000/docs
📁 Estructura de Archivos
uploads/
├── drone/      # Ortomosaicos de dron
├── satellite/  # Imágenes satelitales
├── kml/        # Archivos KML/KMZ
└── processed/  # Coordenadas GPS procesadas
🔌 Endpoints
Upload Ortomosaico Dron
bashPOST /upload/drone
Content-Type: multipart/form-data

file: archivo.tif
description: (opcional)
Upload Imagen Satelital
bashPOST /upload/satellite
Content-Type: multipart/form-data

file: imagen.tif
satellite: (opcional) "Sentinel-2"
date: (opcional) "2024-01-15"
Upload KML
bashPOST /upload/kml
Content-Type: multipart/form-data

file: area.kml
description: (opcional)
Upload Coordenadas GPS
bashPOST /upload/coordinates
Content-Type: application/json

{
  "latitude": -25.2637,
  "longitude": -57.5759,
  "format_type": "decimal"
}
Listar Uploads
bashGET /uploads?type=drone&limit=50
Consultar Estado
bashGET /uploads/{file_id}
Eliminar Archivo
bashDELETE /uploads/{file_id}
🌐 Integración con Frontend
El HTML ya incluye integración automática con el backend:

Inicia el backend: python mapia_backend.py
Abre mapia_digital_landing.html en navegador
Los archivos se suben automáticamente al hacer click

Importante: Para producción, cambiar:
javascriptconst API_URL = 'http://localhost:8000';
// a
const API_URL = 'https://tu-dominio.com/api';
📦 Dependencias Opcionales
Para procesamiento geoespacial avanzado:
bash# Descomenta en requirements.txt y ejecuta:
pip install rasterio gdal geopandas shapely
🔧 Configuración
Editar en mapia_backend.py:
pythonMAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_IMAGE_FORMATS = {".tif", ".tiff", ...}
🐳 Docker (Opcional)
dockerfileFROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY mapia_backend.py .
CMD ["python", "mapia_backend.py"]
bashdocker build -t mapia-api .
docker run -p 8000:8000 -v $(pwd)/uploads:/app/uploads mapia-api
🔐 Producción
Agregar:

Autenticación (JWT, OAuth)
Rate limiting
HTTPS
Storage en cloud (S3, GCS)
Cola de procesamiento (Celery)
Monitoreo (Prometheus)

bash# Con Gunicorn para producción
pip install gunicorn
gunicorn mapia_backend:app -w 4 -k uvicorn.workers.UvicornWorker
