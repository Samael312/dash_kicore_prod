import pandas as pd
import json
from datetime import datetime

def safe_json(x):
    """Convierte strings JSON a dict. Si falla → None"""
    if isinstance(x, dict):
        return x
    if isinstance(x, str):
        if not x.strip():
            return None
        try:
            return json.loads(x.replace("'", '"'))
        except:
            return None
    return None


def extract_version(json_obj):
    """Extrae la versión 'quiiotd_version' del diccionario."""
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("quiiotd_version", None)


def extract_compilation(json_obj):
    """Extrae la fecha de compilación del diccionario."""
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("compilation_date", None)


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
    if not json_data:
        return pd.DataFrame()

    df = pd.DataFrame(json_data)

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