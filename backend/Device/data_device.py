import pandas as pd

def _merge_model_info(df_devices, df_software, df_models):
    """
    Función auxiliar para cruzar Dispositivos -> Software -> Modelos
    y obtener el nombre real del modelo.
    """
    if df_devices.empty:
        return df_devices

    # 1. Asegurar que las columnas clave sean string para evitar errores de merge
    # Dispositivos -> Software
    if 'version_uuid' in df_devices.columns:
        df_devices['version_uuid'] = df_devices['version_uuid'].astype(str)
    
    # Software
    if not df_software.empty and 'uuid' in df_software.columns:
        df_software['uuid'] = df_software['uuid'].astype(str)
        df_software['model_uuid'] = df_software['model_uuid'].astype(str)
    
    # Modelos
    if not df_models.empty and 'uuid' in df_models.columns:
        df_models['uuid'] = df_models['uuid'].astype(str)

    # 2. Merge: Dispositivos + Software (por version_uuid)
    # Usamos left join para no perder dispositivos sin versión conocida
    df_merged = df_devices.merge(
        df_software[['uuid', 'model_uuid']], 
        left_on='version_uuid', 
        right_on='uuid', 
        how='left', 
        suffixes=('', '_soft')
    )

    # 3. Merge: Resultado + Modelos (por model_uuid)
    df_final = df_merged.merge(
        df_models[['uuid', 'name']], 
        left_on='model_uuid', 
        right_on='uuid', 
        how='left', 
        suffixes=('', '_model_real')
    )

    # 4. Consolidar el nombre del model
    # Si encontramos el nombre en la tabla modelos, lo usamos. Si no, fallback a 'name' original o 'Genérico'
    if 'name_model_real' in df_final.columns:
        df_final['real_model_name'] = df_final['name_model_real'].fillna('Desconocido')
    else:
        df_final['real_model_name'] = 'Desconocido'
        
    return df_final

def _get_status_label(val):
    s = str(val).lower()
    return "Conectado" if s in ["terminado", "online", "connected", "true"] else "Desconectado"

def _get_enabled_label(val):
    s = str(val).lower()
    return "Habilitado" if s in ["terminado", "asignado", "fabricado", "true", "enabled"] else "Deshabilitado"

def prepare_boards(data, df_models=None, df_soft=None):
    """
    Prepara Boards. Acepta DataFrames opcionales de modelos y software para enriquecer la data.
    """
    if isinstance(data, list):
        if not data: # Si la lista está vacía
            return pd.DataFrame()
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        # Si llega algo nulo o desconocido
        return pd.DataFrame()

    # 2. Verificar si el DF está vacío después de la conversión
    if df.empty:
        return df

    # --- Lógica de Limpieza y Normalización ---
    
    # ORGANIZACIÓN: Buscamos la columna más adecuada según el archivo (Boards o Kiwi)
    if "final_client" in df.columns:
        df["organization"] = df["final_client"].fillna("Sin Asignar")
    elif "name" in df.columns:
        df["organization"] = df["name"].fillna("Sin Asignar")
    elif "order_id" in df.columns:
        df["organization"] = df["order_id"].fillna("Sin Asignar") # Kiwi suele usar order_id
    else:
        df["organization"] = "Desconocida"

    # MODELO: Boards tiene 'model', Kiwi no (usamos Genérico o derivado)
    if "model" in df.columns:
        df["model"] = df["model"].fillna("Genérico")
    elif "ssid" in df.columns:
        df["model"] = df["software"].fillna("Genérico")

    # ESTADO (Status): Normalizamos la columna 'state' o 'status'
    col_state = "state" if "state" in df.columns else "status"
    
    def get_status_label(val):
        s = str(val).lower()
        if s in ["terminado", "online", "connected", "true"]:
            return "Conectado"
        return "Desconectado"

    def get_enabled_label(val):
        s = str(val).lower()
        if s in ["terminado", "asignado", "fabricado", "true", "enabled"]:
            return "Habilitado"
        return "Deshabilitado"

    # Aplicamos la limpieza solo si existe la columna origen
    if col_state in df.columns:
        df["status_clean"] = df[col_state].apply(get_status_label)
        df["enabled_clean"] = df[col_state].apply(get_enabled_label)
    else:
        df["status_clean"] = "Desconectado"
        df["enabled_clean"] = "Deshabilitado"

    return df