import pandas as pd
import json
<<<<<<< HEAD
=======
from datetime import datetime
>>>>>>> master

def safe_json(x):
    """Convierte strings JSON a dict. Si falla → None"""
    if isinstance(x, dict):
        return x
    if isinstance(x, str):
<<<<<<< HEAD
        # Maneja strings vacíos y la corrección de comillas simples (' a ")
        if not x.strip():
            return None
        try: 
            # Reemplazo de comillas simples por dobles, común en datos exportados
            return json.loads(x.replace("'", '"')) 
=======
        if not x.strip():
            return None
        try:
            return json.loads(x.replace("'", '"'))
>>>>>>> master
        except:
            return None
    return None


def extract_version(json_obj):
<<<<<<< HEAD
    """Extrae la versión 'quiiotd_version' del diccionario de información."""
    if not isinstance(json_obj, dict):
        return None
    # Usamos .get() directamente para manejo seguro de claves
    return json_obj.get("quiiotd_version", None)
    
def extract_compilation(json_obj):
    """Extrae la fecha de compilación 'compilation_date' del diccionario de información."""
=======
    """Extrae la versión 'quiiotd_version' del diccionario."""
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("quiiotd_version", None)


def extract_compilation(json_obj):
    """Extrae la fecha de compilación del diccionario."""
>>>>>>> master
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("compilation_date", None)

<<<<<<< HEAD
def process_devicesInfo(json_data, info_column_name='info'):
    """
    Procesa los datos crudos, extrae y normaliza las columnas de versión 
    y fecha de compilación del JSON anidado.
    """
=======

def compute_update_status(date_str):
    """Clasifica dispositivos como Actualizados/Desactualizados según fecha >= Jun 2025"""
    if not date_str:
        return "Sin Datos"
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        cutoff = datetime(2025, 6, 1)
        return "Actualizado" if date_obj >= cutoff else "Desactualizado"
    except:
        return "Desconocido"


def process_devicesInfo(json_data, info_column_name='info'):
    """Procesa JSON crudo y añade columnas normalizadas."""
>>>>>>> master
    if not json_data:
        return pd.DataFrame()

    df = pd.DataFrame(json_data)
<<<<<<< HEAD
    
    # Aseguramos que la columna 'info' exista antes de procesar
    if "info" not in df.columns:
     
        df["info"] = None
     
        df['quiiotd_version'] = None
        df['compilation_date'] = None
        return df

    # 1. Aplicamos safe_json a la columna que contiene el JSON (asumimos 'info')
    df['info_json'] = df["info"].apply(safe_json)
    
    # 2. Aplicamos las funciones de extracción a la nueva columna 'info_json'
    df['quiiotd_version'] = df['info_json'].apply(extract_version)
    df['compilation_date'] = df['info_json'].apply(extract_compilation)
    
    # Opcional: Eliminar la columna intermedia si ya no se necesita
    df = df.drop(columns=['info_json'], errors='ignore')

    return df
=======

    if "info" not in df.columns:
        df["info"] = None
        df["quiiotd_version"] = None
        df["compilation_date"] = None
        df["update_status"] = "Sin Datos"
        return df

    df["info_json"] = df["info"].apply(safe_json)

    df["quiiotd_version"] = df["info_json"].apply(extract_version)
    df["compilation_date"] = df["info_json"].apply(extract_compilation)
    df["update_status"] = df["compilation_date"].apply(compute_update_status)

    return df.drop(columns=["info_json"], errors="ignore")
>>>>>>> master
