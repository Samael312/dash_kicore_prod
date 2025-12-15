# Archivo: app/logic/data_device.py
import pandas as pd
import numpy as np # Necesario para algunas comparaciones seguras

def _merge_model_info(df_devices, df_software, df_models):
    """
    Función auxiliar para cruzar Dispositivos -> Software -> Modelos
    y obtener el nombre real del modelo.
    """
    if df_devices.empty:
        return df_devices

    # 1. Asegurar que las columnas clave sean string para evitar errores de merge
    if 'version_uuid' in df_devices.columns:
        df_devices['version_uuid'] = df_devices['version_uuid'].astype(str)
    
    if not df_software.empty and 'uuid' in df_software.columns:
        df_software['uuid'] = df_software['uuid'].astype(str)
        if 'model_uuid' in df_software.columns:
            df_software['model_uuid'] = df_software['model_uuid'].astype(str)
    
    if not df_models.empty and 'uuid' in df_models.columns:
        df_models['uuid'] = df_models['uuid'].astype(str)

    # 2. Merge: Dispositivos + Software (por version_uuid)
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

    # 4. Consolidar el nombre del modelo
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
    Prepara Boards. Acepta DataFrames opcionales de modelos y software.
    """
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    # --- LÓGICA DE CRUCE DE MODELOS ---
    if df_models is not None and df_soft is not None and not df_models.empty and not df_soft.empty:
        try:
            df = _merge_model_info(df, df_soft, df_models)
            df["model"] = df["real_model_name"]
        except Exception as e:
            print(f"⚠️ Error merging models: {e}")
            df["model"] = "Genérico (Error Merge)"
    else:
        # Fallback
        if "name" in df.columns:
            df["model"] = df["name"].fillna("Genérico")
        elif "ki_id" in df.columns:
            df["model"] = df["ki_id"].fillna("Genérico")
        else:
            df["model"] = "Genérico"

    # --- LÓGICA DE ORGANIZACIÓN ---
    df["organization"] = df["final_client"].fillna("Sin Asignar") if "final_client" in df.columns else "Sin Asignar"

    # --- STATUS Y ENABLED ---
    col_state = "state" if "state" in df.columns else "status"

    df["status_clean"] = df[col_state].apply(_get_status_label) if col_state in df.columns else "Desconectado"
    df["enabled_clean"] = df[col_state].apply(_get_enabled_label) if col_state in df.columns else "Deshabilitado"


    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    return df

# -------------------------------------------------------------------------
# KIWI
# -------------------------------------------------------------------------
def prepare_kiwi(data, df_models=None, df_soft=None):
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    # --- LÓGICA DE CRUCE DE MODELOS ---
    if df_soft is not None and not df_soft.empty and 'version_uuid' in df.columns:
        try:
            # 1. Limpieza de IDs
            df['version_uuid'] = df['version_uuid'].astype(str).str.strip().str.lower()
            
            df_soft_clean = df_soft.copy()
            if 'uuid' in df_soft_clean.columns:
                df_soft_clean['uuid'] = df_soft_clean['uuid'].astype(str).str.strip().str.lower()
            
            # 2. Preparamos el DataFrame de Software
            df_soft_ready = df_soft_clean[['uuid', 'name']].rename(columns={'name': 'software_name'})
            df_soft_ready = df_soft_ready.drop_duplicates(subset=['uuid'])

            # 3. Merge
            df_merged = df.merge(
                df_soft_ready, 
                left_on='version_uuid', 
                right_on='uuid', 
                how='left'
            )

            # 4. Asignamos el nombre
            if 'software_name' in df_merged.columns:
                fallback = df["ssid"] if "ssid" in df.columns else "Genérico"
                df["model"] = df_merged['software_name'].fillna(fallback)
            else:
                df["model"] = df["ssid"].fillna("Genérico") if "ssid" in df.columns else "Genérico"
        except Exception as e:
            print(f"⚠️ Error merging Kiwi: {e}")
            df["model"] = "Genérico"
            
    else:
        df["model"] = df["ssid"].fillna("Genérico") if "ssid" in df.columns else "Genérico"

    # --- RESTO DE CAMPOS ---
    df["organization"] = "Sin Asignar"
    col_state = "state" if "state" in df.columns else "status"
    
    df["status_clean"] = df[col_state].apply(_get_status_label) if col_state in df.columns else "Desconectado"
    df["enabled_clean"] = df[col_state].apply(_get_enabled_label) if col_state in df.columns else "Deshabilitado"

    # ==============================================================================
    # SOLUCIÓN DEFINITIVA AL ERROR DE JSON / NaN
    # ==============================================================================
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    return df