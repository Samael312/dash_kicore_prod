import pandas as pd
import json
import math
from datetime import datetime, timezone


def safe_json(x):
    """Convierte strings JSON a dict. Si falla → None"""
    if isinstance(x, dict):
        return x
    if isinstance(x, str):
        if not x.strip():
            return None
        try:
            return json.loads(x)
        except:
            try:
                return json.loads(x.replace("'", '"'))
            except:
                return None
    return None


def _safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _epoch_to_iso(val):
    f = _safe_float(val)
    if f is None:
        return None
    try:
        return datetime.fromtimestamp(f, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except (OSError, OverflowError, ValueError):
        return None


def extract_version(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("quiiotd_version", None)


def extract_compilation(json_obj):
    if not isinstance(json_obj, dict):
        return None
    raw = json_obj.get("compilation_date", None)
    if not raw:
        return None
    # Normalizar: "2026-01-14 12:31:44+00:00" → "2026-01-14"
    return str(raw).split(" ")[0].split("T")[0]


def extract_osname(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("osname", None)


def extract_osversion(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("osversion", None)


def extract_board_model(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("board_model", None)


def extract_api_version(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("api_version", None)


def extract_uptime(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return json_obj.get("uptime", None)


def extract_free_ram(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return _safe_float(json_obj.get("free_ram", None))


def extract_sys_temp(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return _safe_float(json_obj.get("sys_temp", None))


def extract_free_size(json_obj):
    if not isinstance(json_obj, dict):
        return None
    return _safe_float(json_obj.get("free_size", None))


def extract_info_timestamp(json_obj):
    """Convierte el timestamp interno del info de epoch → ISO 8601 UTC."""
    if not isinstance(json_obj, dict):
        return None
    return _epoch_to_iso(json_obj.get("timestamp", None))


def extract_interfaces(json_obj):
    """
    Extrae las IPs de las interfaces como string legible.
    Ej: "eth0: 172.17.4.150 | tun0: 10.13.0.6"
    """
    if not isinstance(json_obj, dict):
        return None
    interfaces = json_obj.get("interfaces", [])
    if not isinstance(interfaces, list) or not interfaces:
        return None
    parts = []
    for iface in interfaces:
        name = iface.get("iface_name", "")
        ip   = iface.get("ip", "")
        if name and ip:
            parts.append(f"{name}: {ip}")
    return " | ".join(parts) if parts else None


def compute_update_status(date_str):
    """Clasifica dispositivos como Actualizados/Desactualizados según fecha >= Jun 2025"""
    if not date_str:
        return "Sin Datos"
    try:
        date_obj = datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
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
        df["quiiotd_version"]  = None
        df["compilation_date"] = None
        df["update_status"]    = "Sin Datos"
        return df

    df["info_json"] = df["info"].apply(safe_json)

    df["quiiotd_version"]  = df["info_json"].apply(extract_version)
    df["compilation_date"] = df["info_json"].apply(extract_compilation)
    df["update_status"]    = df["compilation_date"].apply(compute_update_status)

    df["board_model"]      = df["info_json"].apply(extract_board_model)
    df["osname"]           = df["info_json"].apply(extract_osname)
    df["osversion"]        = df["info_json"].apply(extract_osversion)
    df["api_version"]      = df["info_json"].apply(extract_api_version)
    df["uptime"]           = df["info_json"].apply(extract_uptime)
    df["free_ram_mb"]      = df["info_json"].apply(extract_free_ram)
    df["sys_temp_c"]       = df["info_json"].apply(extract_sys_temp)
    df["free_size_mb"]     = df["info_json"].apply(extract_free_size)
    df["info_timestamp"]   = df["info_json"].apply(extract_info_timestamp)
    df["interfaces"]       = df["info_json"].apply(extract_interfaces)

    # Limpiar NaN residuales
    df = df.astype(object).where(pd.notnull(df), None)

    return df.drop(columns=["info_json"], errors="ignore")