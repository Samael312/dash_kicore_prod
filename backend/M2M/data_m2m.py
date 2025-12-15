import pandas as pd
import json

# ================================
# FUNCIONES AUXILIARES
# ================================

def safe_json(x):
    """Convierte strings JSON a dict. Si falla → None"""
    if isinstance(x, dict):
        return x
    if isinstance(x, str):
        try: 
            return json.loads(x.replace("'", '"'))  # Arreglo típico del Excel
        except:
            return None
    return None

def extract_total_consumption(json_obj):
    """
    Extrae el consumo total (voice + sms + data) desde el JSON.
    Espera estructura tipo:
    {
        "voice": {"value": ...},
        "sms": {"value": ...},
        "data": {"value": ...}
    }
    """
    if not isinstance(json_obj, dict):
        return None
    try:
        voice = json_obj.get("voice", {}).get("value", 0) or 0
        sms = json_obj.get("sms", {}).get("value", 0) or 0
        data = json_obj.get("data", {}).get("value", 0) or 0
        return voice + sms + data
    except:
        return None

def extract_countryCode(json_obj):
    if not isinstance(json_obj, dict):
        return None
    try:
        return json_obj.get("sgsn", {}).get("operator", {}).get("countryCode", None)
    except:
        return None

def extract_alarm_count(json_obj):
    """Cuenta alarmas de la columna 'alarms'."""
    if not isinstance(json_obj, list):
        return 0
    return len(json_obj)

def format_bytes_to_readable(value_bytes):
    """Convierte bytes a MB o GB según magnitud."""
    if value_bytes is None:
        return "N/A"
    
    mb = value_bytes / 1_048_576  # bytes → MB
    if mb >= 1000:  # si es mayor a ~3GB
        gb = mb / 1024
        return f"{gb:.2f} GB"
    else:
        return f"{mb:.2f} MB"

def determine_usage_tier(mb_value):
    """Clasifica el consumo en categorías de negocio."""
    if mb_value <= 0:
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
    if not json_data:
        return pd.DataFrame()

    df = pd.DataFrame(json_data)

    # ESTADO
    df['status_clean'] = df.get('lifeCycleStatus', pd.Series([None]*len(df))).fillna('DESCONOCIDO')

    # TARIFA
    df['rate_plan'] = df.get('servicePack', pd.Series([None]*len(df))).fillna('Sin Plan')

    # TIPO DE RED
    df['network_type'] = df.get('ratType', pd.Series([255]*len(df))).fillna(255)
    df.loc[df['network_type'] == 1, 'network_type'] = '3G'
    df.loc[df['network_type'] == 2, 'network_type'] = '2G'
    df.loc[df['network_type'] == 5, 'network_type'] = '3.5G'
    df.loc[df['network_type'] == 6, 'network_type'] = '4G'
    df.loc[df['network_type'] == 8, 'network_type'] = 'NB-IoT'
    df.loc[df['network_type'].isin([255, 'N/A']), 'network_type'] = 'Sin Información'

    # ORGANIZACIÓN
    df['organization'] = df.get('customField1', pd.Series(["N/A"]*len(df))).astype(str)

    # 2. PROCESAMIENTO ROBUSTO DE CONSUMO
    # Extraemos bytes crudos
    df['consumptionDaily_json'] = df.get('consumptionDaily', pd.Series([None]*len(df))).apply(safe_json)
    df['consumptionMonthly_json'] = df.get('consumptionMonthly', pd.Series([None]*len(df))).apply(safe_json)

    df['cons_daily'] = df['consumptionDaily_json'].apply(extract_total_consumption).fillna(0) # Bytes int
    df['cons_month'] = df['consumptionMonthly_json'].apply(extract_total_consumption).fillna(0) # Bytes int

    # --- MEJORA LÓGICA 1: Conversión a Float (MB) para Gráficos ---
    # Convertimos a MB (1 MB = 1024 * 1024 bytes)
    df['cons_daily_mb'] = df['cons_daily'] / 1048576.0 
    df['cons_month_mb'] = df['cons_month'] / 1048576.0 
    
    # --- MEJORA LÓGICA 2: Categorización (Tiers) ---
    # Esto permite hacer gráficos de pastel o barras agrupadas
    df['usage_tier_daily'] = df['cons_daily_mb'].apply(determine_usage_tier)
    df['usage_tier_month'] = df['cons_month_mb'].apply(determine_usage_tier)
    # Strings legibles para Tablas/Tooltips
    df['cons_daily_readable'] = df['cons_daily'].apply(format_bytes_to_readable)

    # 5. COUNTRY CODE desde presence JSON
    df['presence_json'] = df['presence'].apply(safe_json)
    df['country_code'] = df['presence_json'].apply(extract_countryCode)
    df['country_code'] = df['country_code'].fillna("N/A")

    # Conversión a formato legible MB/GB
    df['cons_daily_readable'] = df['cons_daily'].apply(format_bytes_to_readable)
    df['cons_month_readable'] = df['cons_month'].apply(format_bytes_to_readable)

    # ALARMAS
    df['alarms_json'] = df.get('alarms', pd.Series([None]*len(df))).apply(safe_json)
    df['alarm_count'] = df['alarms_json'].apply(extract_alarm_count)

    return df