import pandas as pd
import json

# ================================
# FUNCIONES AUXILIARES
# ================================

def safe_json(x):
    """Convierte strings JSON a dict. Si falla o es NaN → None"""
    if isinstance(x, dict):
        return x
    if isinstance(x, str):
        try: 
            return json.loads(x.replace("'", '"')) 
        except:
            return None
    return None

def extract_total_consumption(json_obj):
    """
    Extrae el consumo total (voice + sms + data) desde el JSON.
    """
    if not isinstance(json_obj, dict):
        return 0.0
    try:
        voice = json_obj.get("voice", {}).get("value", 0) or 0
        sms = json_obj.get("sms", {}).get("value", 0) or 0
        data = json_obj.get("data", {}).get("value", 0) or 0
        return float(voice + sms + data)
    except:
        return 0.0

def extract_countryCode(json_obj):
    if not isinstance(json_obj, dict):
        return "N/A"
    try:
        code = json_obj.get("sgsn", {}).get("operator", {}).get("countryCode", None)
        return code if code else "N/A"
    except:
        return "N/A"

def extract_alarm_count(json_obj):
    """Cuenta alarmas de la columna 'alarms'."""
    if isinstance(json_obj, list):
        return len(json_obj)
    return 0

def format_bytes_to_readable(value_bytes):
    """Convierte bytes a MB o GB según magnitud."""
    if value_bytes is None or value_bytes == 0:
        return "0 MB"
    
    mb = value_bytes / 1_048_576.0  # bytes → MB (float)
    if mb >= 1024:
        gb = mb / 1024.0
        return f"{gb:.2f} GB"
    else:
        return f"{mb:.2f} MB"

def determine_usage_tier(mb_value):
    """Clasifica el consumo en categorías de negocio."""
    if pd.isna(mb_value) or mb_value <= 0:
        return "Inactivo (0 MB)"
    elif mb_value < 1:
        return "Bajo (< 1 MB)"
    elif mb_value < 10:
        return "Medio (1 - 10 MB)"
    elif mb_value < 100:
        return "Alto (10 - 100 MB)"
    else:
        return "Extremo (> 100 MB)"

# ================================
# PROCESAMIENTO DE M2M
# ================================

def process_m2m(json_data):
    """
    Procesa la lista de datos crudos de M2M y devuelve un DataFrame limpio.
    """
    if not json_data:
        return pd.DataFrame()

    df = pd.DataFrame(json_data)

    # 1. ESTADO DE CICLO DE VIDA (CORREGIDO: TRADUCCIÓN A ESPAÑOL)
    raw_status = df.get('lifeCycleStatus', pd.Series([None]*len(df)))
    
    # Aquí es donde se hace el mapeo real
    status_map = {
        "ACTIVE": "Activo",
        "ACTIVATION_READY": "Listo para activar",
        "DEACTIVATED": "Desactivado",
        "INACTIVE_NEW": "Inactivo Nuevo",
        "TEST": "Prueba",
    }
    
    # Mapeamos y llenamos nulos con el valor original o 'Desconocido'
    df['status_clean'] = raw_status.map(status_map).fillna(raw_status).fillna('Desconocido')

    # 2. PLAN DE TARIFAS
    df['rate_plan'] = df.get('servicePack', pd.Series([None]*len(df))).fillna('Sin Plan')

    # 3. TIPO DE RED (RAT Type)
    network_map = {
        1: '3G',
        2: '2G',
        5: '3.5G',
        6: '4G',
        8: 'NB-IoT'
    }
    
    rat_type_series = pd.to_numeric(df.get('ratType', pd.Series()), errors='coerce')
    df['network_type'] = rat_type_series.map(network_map).fillna('N/A')

    # 4. ORGANIZACIÓN (Custom Field 1)
    df['organization'] = df.get('customField1', pd.Series(["N/A"]*len(df))).fillna("N/A").astype(str)

    # 5. ICCID (Identificador único SIM)
    df['iccid'] = df.get('icc', pd.Series(["N/A"]*len(df))).fillna("N/A").astype(str)

    # 6. PROCESAMIENTO DE CONSUMO (JSON anidado)
    col_daily = df.get('consumptionDaily', pd.Series([None]*len(df)))
    col_monthly = df.get('consumptionMonthly', pd.Series([None]*len(df)))
    
    daily_json = col_daily.apply(safe_json)
    monthly_json = col_monthly.apply(safe_json)

    # Calculamos bytes totales (float)
    df['cons_daily'] = daily_json.apply(extract_total_consumption)
    df['cons_month'] = monthly_json.apply(extract_total_consumption)

    # Calculamos MB (float) para gráficas
    df['cons_daily_mb'] = df['cons_daily'] / 1_048_576.0
    df['cons_month_mb'] = df['cons_month'] / 1_048_576.0

    # Categorización (Tiers)
    df['usage_tier_daily'] = df['cons_daily_mb'].apply(determine_usage_tier)
    df['usage_tier_month'] = df['cons_month_mb'].apply(determine_usage_tier)

    # Formato legible para Tabla (Strings)
    df['cons_daily_readable'] = df['cons_daily'].apply(format_bytes_to_readable)
    df['cons_month_readable'] = df['cons_month'].apply(format_bytes_to_readable)

    # 7. PAÍS (Desde 'presence')
    col_presence = df.get('presence', pd.Series([None]*len(df)))
    df['country_code'] = col_presence.apply(safe_json).apply(extract_countryCode)

    # 8. ALARMAS
    col_alarms = df.get('alarms', pd.Series([None]*len(df)))
    df['alarm_count'] = col_alarms.apply(safe_json).apply(extract_alarm_count)

    # ================================
    # LIMPIEZA FINAL
    # ================================
    cols_to_keep = [
        'iccid', 
        'status_clean', 
        'rate_plan', 
        'network_type', 
        'organization',
        'country_code',
        'alarm_count',
        'cons_daily_mb', 
        'cons_month_mb',
        'usage_tier_daily',
        'usage_tier_month',
        'cons_daily_readable',
        'cons_month_readable'
    ]
    
    final_cols = [c for c in cols_to_keep if c in df.columns]
    
    return df[final_cols]