# Archivo: app/logic/data_pool.py
import pandas as pd
import ast

def extract_sim(val):
    """
    Parsea el string y extrae número de sims activas y totales.
    Devuelve una Serie para crear dos columnas.
    """
    # 1. Convertir string a dict si es necesario
    if isinstance(val, str):
        try:
            val = ast.literal_eval(val)
        except (ValueError, SyntaxError):
            val = {}
    
    if not isinstance(val, dict):
        val = {}

    try:
        activas = val.get("activeCards", 0) or 0
        total = val.get("totalSim", 0) or 0
        return pd.Series([activas, total], index=['sims_active', 'sims_total'])
    except:
        return pd.Series([0, 0], index=['sims_active', 'sims_total'])

def extract_consumo(val):
    """
    Parsea el string y extrae consumo y límite.
    Devuelve una Serie para crear dos columnas.
    """
    # 1. Convertir string a dict si es necesario
    if isinstance(val, str):
        try:
            val = ast.literal_eval(val)
        except (ValueError, SyntaxError):
            val = {}

    if not isinstance(val, dict):
        val = {}

    try:
        consumo = val.get("consumedData", 0) or 0
        # Corregido: la clave en el excel es 'limitData', no 'totalSim'
        limit_data = val.get("limitData", 0) or 0  
        return pd.Series([consumo, limit_data], index=['bytes_consumed', 'bytes_limit'])
    except:
        return pd.Series([0, 0], index=['bytes_consumed', 'bytes_limit'])

def process_pools(raw_data):
    """
    Limpia y estructura los datos de Pools usando las funciones de extracción.
    """
    if not raw_data:
        return pd.DataFrame()

    df = pd.DataFrame(raw_data)

    # 1. Procesar columnas complejas generando nuevas columnas
    # Esto devuelve un DataFrame con 'sims_active' y 'sims_total'
    sim_cols = df['activeSim'].apply(extract_sim)
    
    # Esto devuelve un DataFrame con 'bytes_consumed' y 'bytes_limit'
    usage_cols = df['consumedData'].apply(extract_consumo)

    # 2. Unir todo al DataFrame original
    df_clean = pd.concat([df, sim_cols, usage_cols], axis=1)

    # 3. Limpieza y Conversión de Tipos
    cols_to_fix = ['sims_active', 'sims_total', 'bytes_consumed', 'bytes_limit']
    for col in cols_to_fix:
        if col in df_clean.columns:
            # fillna(0) y asegurar int (especialmente para bytes grandes)
            df_clean[col] = df_clean[col].fillna(0).astype('int64')
        else:
            df_clean[col] = 0

    # 4. Cálculos útiles para el Dashboard
    df_clean['usage_percent'] = df_clean.apply(
        lambda row: (row['bytes_consumed'] / row['bytes_limit'] * 100) if row['bytes_limit'] > 0 else 0.0, 
        axis=1
    )
    
    # Redondear porcentaje a 2 decimales
    df_clean['usage_percent'] = df_clean['usage_percent'].round(2)

    # 5. Seleccionar columnas finales
    final_cols = [
        'pool_id', 
        'commercialGroup', 
        'sims_active', 
        'sims_total', 
        'bytes_consumed', 
        'bytes_limit', 
        'usage_percent'
    ]
    
    # Filtrar solo columnas existentes para evitar errores si falta alguna
    return df_clean[[c for c in final_cols if c in df_clean.columns]]