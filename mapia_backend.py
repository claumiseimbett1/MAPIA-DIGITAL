"""
Backend API para Mapia Digital - Procesamiento de datos geoespaciales
FastAPI + procesamiento de ortomosaicos, KML, GPS
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional, List
import os
import shutil
from pathlib import Path
import uuid
from datetime import datetime
import xml.etree.ElementTree as ET

app = FastAPI(title="Mapia Digital API", version="1.0.0")

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración
UPLOAD_DIR = Path("uploads")
ALLOWED_IMAGE_FORMATS = {".tif", ".tiff", ".geotiff", ".jpg", ".jpeg", ".png", ".hdf"}
ALLOWED_KML_FORMATS = {".kml", ".kmz"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

# Crear directorios
for subdir in ["drone", "satellite", "kml", "processed"]:
    (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)


class GPSCoordinates(BaseModel):
    """Modelo para coordenadas GPS"""
    latitude: float
    longitude: float
    format_type: str = "decimal"  # decimal, dms, utm
    zone: Optional[str] = None
    
    @validator('latitude')
    def validate_lat(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitud debe estar entre -90 y 90')
        return v
    
    @validator('longitude')
    def validate_lon(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitud debe estar entre -180 y 180')
        return v


class BoundingBox(BaseModel):
    """Modelo para área de interés"""
    north: float
    south: float
    east: float
    west: float


def generate_file_id() -> str:
    """Genera ID único para archivo"""
    return f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"


def validate_file_size(file: UploadFile) -> None:
    """Valida tamaño del archivo"""
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo muy grande. Máximo: {MAX_FILE_SIZE / 1024 / 1024} MB"
        )


def parse_kml(file_path: Path) -> dict:
    """Extrae información básica de archivo KML"""
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Namespace de KML
        ns = {'kml': 'http://www.opengis.net/kml/2.2'}
        
        placemarks = []
        for placemark in root.findall('.//kml:Placemark', ns):
            name = placemark.find('kml:name', ns)
            coords = placemark.find('.//kml:coordinates', ns)
            
            if coords is not None:
                coord_text = coords.text.strip()
                # Parse coordinates (lon,lat,alt)
                points = []
                for coord in coord_text.split():
                    parts = coord.split(',')
                    if len(parts) >= 2:
                        points.append({
                            'lon': float(parts[0]),
                            'lat': float(parts[1]),
                            'alt': float(parts[2]) if len(parts) > 2 else 0
                        })
                
                placemarks.append({
                    'name': name.text if name is not None else 'Sin nombre',
                    'coordinates': points,
                    'num_points': len(points)
                })
        
        return {
            'num_features': len(placemarks),
            'features': placemarks
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parseando KML: {str(e)}")


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "online",
        "service": "Mapia Digital API",
        "version": "1.0.0"
    }


@app.post("/upload/drone")
async def upload_drone_ortomosaic(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    """
    Endpoint para subir ortomosaicos de dron
    Acepta: TIFF, GeoTIFF, JPG
    """
    # Validar extensión
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Use: {', '.join(ALLOWED_IMAGE_FORMATS)}"
        )
    
    # Validar tamaño
    validate_file_size(file)
    
    # Generar nombre único
    file_id = generate_file_id()
    save_filename = f"{file_id}{file_ext}"
    save_path = UPLOAD_DIR / "drone" / save_filename
    
    # Guardar archivo
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando archivo: {str(e)}")
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "filename": file.filename,
        "saved_as": save_filename,
        "type": "drone_ortomosaic",
        "size_mb": round(save_path.stat().st_size / 1024 / 1024, 2),
        "description": description,
        "status": "uploaded",
        "message": "Ortomosaico cargado exitosamente. Procesamiento pendiente."
    })


@app.post("/upload/satellite")
async def upload_satellite_image(
    file: UploadFile = File(...),
    satellite: Optional[str] = Form(None),  # Sentinel, Landsat, etc
    date: Optional[str] = Form(None)
):
    """
    Endpoint para subir imágenes satelitales
    Acepta: TIFF, GeoTIFF, HDF
    """
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Use: {', '.join(ALLOWED_IMAGE_FORMATS)}"
        )
    
    validate_file_size(file)
    
    file_id = generate_file_id()
    save_filename = f"{file_id}{file_ext}"
    save_path = UPLOAD_DIR / "satellite" / save_filename
    
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando archivo: {str(e)}")
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "filename": file.filename,
        "saved_as": save_filename,
        "type": "satellite_image",
        "satellite": satellite,
        "date": date,
        "size_mb": round(save_path.stat().st_size / 1024 / 1024, 2),
        "status": "uploaded",
        "message": "Imagen satelital cargada exitosamente"
    })


@app.post("/upload/kml")
async def upload_kml_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    """
    Endpoint para subir archivos KML/KMZ
    Parse automático de coordenadas
    """
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_KML_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Use: {', '.join(ALLOWED_KML_FORMATS)}"
        )
    
    validate_file_size(file)
    
    file_id = generate_file_id()
    save_filename = f"{file_id}{file_ext}"
    save_path = UPLOAD_DIR / "kml" / save_filename
    
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando archivo: {str(e)}")
    
    # Parsear KML si no es KMZ
    kml_data = None
    if file_ext == ".kml":
        try:
            kml_data = parse_kml(save_path)
        except:
            kml_data = {"error": "No se pudo parsear KML"}
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "filename": file.filename,
        "saved_as": save_filename,
        "type": "kml_file",
        "description": description,
        "size_kb": round(save_path.stat().st_size / 1024, 2),
        "parsed_data": kml_data,
        "status": "uploaded",
        "message": "KML cargado exitosamente"
    })


@app.post("/upload/coordinates")
async def upload_gps_coordinates(coords: GPSCoordinates):
    """
    Endpoint para recibir coordenadas GPS directas
    Soporta: decimal, DMS, UTM
    """
    file_id = generate_file_id()
    
    # Guardar coordenadas como JSON
    import json
    coords_path = UPLOAD_DIR / "processed" / f"{file_id}_coords.json"
    
    with open(coords_path, "w") as f:
        json.dump(coords.dict(), f, indent=2)
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "type": "gps_coordinates",
        "coordinates": coords.dict(),
        "status": "received",
        "message": "Coordenadas recibidas exitosamente"
    })


@app.post("/upload/bbox")
async def upload_bounding_box(bbox: BoundingBox):
    """
    Endpoint para área de interés (bounding box)
    """
    file_id = generate_file_id()
    
    import json
    bbox_path = UPLOAD_DIR / "processed" / f"{file_id}_bbox.json"
    
    with open(bbox_path, "w") as f:
        json.dump(bbox.dict(), f, indent=2)
    
    # Calcular área aproximada
    from math import cos, radians
    lat_avg = (bbox.north + bbox.south) / 2
    width_km = abs(bbox.east - bbox.west) * 111.32 * cos(radians(lat_avg))
    height_km = abs(bbox.north - bbox.south) * 111.32
    area_km2 = width_km * height_km
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "type": "bounding_box",
        "bbox": bbox.dict(),
        "area_km2": round(area_km2, 2),
        "status": "received",
        "message": "Área de interés definida exitosamente"
    })


@app.get("/uploads/{file_id}")
async def get_upload_status(file_id: str):
    """
    Consultar estado de un archivo subido
    """
    # Buscar en todos los directorios
    for subdir in ["drone", "satellite", "kml", "processed"]:
        search_dir = UPLOAD_DIR / subdir
        for file_path in search_dir.glob(f"{file_id}*"):
            return JSONResponse({
                "file_id": file_id,
                "filename": file_path.name,
                "type": subdir,
                "size_mb": round(file_path.stat().st_size / 1024 / 1024, 2),
                "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                "status": "uploaded"
            })
    
    raise HTTPException(status_code=404, detail="Archivo no encontrado")


@app.get("/uploads")
async def list_uploads(type: Optional[str] = None, limit: int = 50):
    """
    Listar archivos subidos
    """
    uploads = []
    search_dirs = [type] if type else ["drone", "satellite", "kml", "processed"]
    
    for subdir in search_dirs:
        search_dir = UPLOAD_DIR / subdir
        if not search_dir.exists():
            continue
            
        for file_path in sorted(search_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)[:limit]:
            if file_path.is_file():
                uploads.append({
                    "file_id": file_path.stem.split('_')[0] + '_' + file_path.stem.split('_')[1] if '_' in file_path.stem else file_path.stem,
                    "filename": file_path.name,
                    "type": subdir,
                    "size_mb": round(file_path.stat().st_size / 1024 / 1024, 2),
                    "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
    
    return JSONResponse({
        "total": len(uploads),
        "uploads": uploads[:limit]
    })


@app.delete("/uploads/{file_id}")
async def delete_upload(file_id: str):
    """
    Eliminar archivo subido
    """
    for subdir in ["drone", "satellite", "kml", "processed"]:
        search_dir = UPLOAD_DIR / subdir
        for file_path in search_dir.glob(f"{file_id}*"):
            file_path.unlink()
            return JSONResponse({
                "success": True,
                "message": f"Archivo {file_id} eliminado"
            })
    
    raise HTTPException(status_code=404, detail="Archivo no encontrado")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
