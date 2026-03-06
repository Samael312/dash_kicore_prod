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


def process_installations(raw_data):
    """
    Limpia y estructura los datos de Instalaciones.
    'state', 'enabled', 'last_change' y 'first_connection'
    se extraen del campo 'status'. Los timestamps epoch se convierten a ISO 8601 UTC.
    """
    if not raw_data:
        return pd.DataFrame()

    df = pd.DataFrame(raw_data)

    col_status = df.get('status')

    if col_status is not None:
        status_parsed          = col_status.apply(safe_json)
        df['state']            = status_parsed.apply(extract_link)
        df['enabled']          = status_parsed.apply(extract_enabled)
        df['last_change']      = status_parsed.apply(extract_last_change)
        df['first_connection'] = status_parsed.apply(extract_first_connection)
        
    else:
        df['state']            = None
        df['enabled']          = None
        df['last_change']      = None
        df['first_connection'] = None

    final_cols = [
        'uuid',
        'name',
        'description',
        'state',
        'enabled',
        'last_change',
        'first_connection',
    ]

    df_out = df[[col for col in final_cols if col in df.columns]].copy()

    # Garantía final: reemplazar cualquier NaN/Inf residual con None
    df_out = df_out.astype(object).where(pd.notnull(df_out), None)

    return df_out