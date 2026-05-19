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
            return json.loads(x.replace("'", '"'))
        except:
            return None
    return None

def _safe_float(val):
    """Convierte un valor a float limpio. Devuelve None si es NaN/Inf/None/inválido."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None

def _epoch_to_iso(val):
    """
    Convierte un timestamp epoch (segundos, puede tener decimales) a
    string ISO 8601 UTC: '2025-03-05T12:34:56Z'
    Devuelve None si el valor es None o inválido.
    """
    f = _safe_float(val)
    if f is None:
        return None
    try:
        return datetime.fromtimestamp(f, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except (OSError, OverflowError, ValueError):
        return None

def extract_detected(json_obj):
    """Extrae detected del dict de status."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return json_obj.get("detected", None)
    except:
        return None

def extract_last_change(json_obj):
    """Extrae last_change y lo decodifica de epoch → ISO 8601 UTC."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return _epoch_to_iso(json_obj.get("lastchange"))
    except:
        return None

def process_vpn_status(data):
    """
    Procesa la lista de dispositivos VPN, extrayendo y limpiando campos.
    Devuelve un DataFrame listo para convertir a JSON.
    """
    df = pd.DataFrame(data)
    
    # Extraemos campos anidados y los limpiamos
    df['link_detected'] = df['status'].apply(extract_detected)
    df['last_change'] = df['status'].apply(extract_last_change)

    if 'type' in df.columns:
        
        df['type'] = df['type'].fillna('Unknown')
        
        df = df[df['type'] == 'device']

    return df[['username', 'type', 'link_detected', 'last_change']].replace({math.nan: None})