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


def extract_link(json_obj):
    """Extrae link.detected del dict de status."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return json_obj.get("link", {}).get("detected", None)
    except:
        return None


def extract_enabled(json_obj):
    """Extrae enabled del dict de status."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return json_obj.get("enabled", None)
    except:
        return None


def extract_last_change(json_obj):
    """Extrae last_change y lo decodifica de epoch → ISO 8601 UTC."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return _epoch_to_iso(json_obj.get("link", {}).get("last_change"))
    except:
        return None


def extract_first_connection(json_obj):
    """Extrae first_connection y lo decodifica de epoch → ISO 8601 UTC."""
    if not isinstance(json_obj, dict):
        return None
    try:
        return _epoch_to_iso(json_obj.get("link", {}).get("first_connection"))
    except:
        return None


def process_installations(raw_data, years_to_obsolete=4):
    if not raw_data:
        return []

    df = pd.DataFrame(raw_data)
    now_ts = datetime.now(timezone.utc).timestamp()
    
    # El umbral ahora se calcula dinámicamente basado en el argumento
    threshold_seg = years_to_obsolete * 365.25 * 24 * 3600

    if 'status' in df.columns:
        status_parsed = df['status'].apply(safe_json)
        
        # Extraemos datos necesarios
        df['state'] = status_parsed.apply(lambda x: x.get('link', {}).get('detected') if isinstance(x, dict) else None)
        df['enabled'] = status_parsed.apply(lambda x: x.get('enabled') if isinstance(x, dict) else None)
        
        # Guardamos el timestamp crudo para el cálculo
        raw_last_change = status_parsed.apply(lambda x: _safe_float(x.get('link', {}).get('last_change')) if isinstance(x, dict) else None)
        
        # Generamos los campos para el frontend
        df['last_change'] = raw_last_change.apply(_epoch_to_iso)
        df['first_connection'] = status_parsed.apply(lambda x: _epoch_to_iso(x.get('link', {}).get('first_connection')) if isinstance(x, dict) else None)
        
        # --- LÓGICA BOOLEANA CON EL UMBRAL DINÁMICO ---
        df['obsoletas'] = raw_last_change.apply(
            lambda ts: True if (ts is not None and (now_ts - ts) >= threshold_seg) else False
        )
    else:
        # Defaults en caso de error de datos
        df['state'] = df['enabled'] = False
        df['last_change'] = df['first_connection'] = None
        df['obsoletas'] = False

    # Forzamos booleanos en state y enabled para evitar nulls en el front
    df['state'] = df['state'].apply(lambda x: True if x is True else False)
    df['enabled'] = df['enabled'].apply(lambda x: True if x is True else False)

    final_cols = ['uuid', 'name', 'description', 'state', 'enabled', 'last_change', 'first_connection', 'obsoletas']
    df_out = df[final_cols].replace({math.nan: None})
    return df_out  # Devolvemos el DataFrame puro para que el front lo convierta a JSON con to_dict(orient='records')