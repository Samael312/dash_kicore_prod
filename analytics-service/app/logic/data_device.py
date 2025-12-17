# Archivo: app/logic/data_device.py
import pandas as pd
import numpy as np

def _merge_model_info(df_devices, df_software, df_models, df_ren):
    """
    Función auxiliar para cruzar Dispositivos -> Software -> Modelos -> Renovaciones
    """
    if df_devices.empty:
        return df_devices

    # 1. Asegurar que las columnas clave sean string para evitar errores de merge
    if 'version_uuid' in df_devices.columns:
        df_devices['version_uuid'] = df_devices['version_uuid'].astype(str)
    
    if not df_software.empty:
        if 'uuid' in df_software.columns:
            df_software['uuid'] = df_software['uuid'].astype(str)
        if 'model_uuid' in df_software.columns:
            df_software['model_uuid'] = df_software['model_uuid'].astype(str)
    
    if not df_models.empty:
        if 'uuid' in df_models.columns:
            df_models['uuid'] = df_models['uuid'].astype(str)
    
    # --- CORRECCIÓN AQUÍ: Antes modificabas df_models en lugar de df_ren ---
    if not df_ren.empty:
        if 'uuid' in df_ren.columns:
            df_ren['uuid'] = df_ren['uuid'].astype(str)

    # 2. Merge: Dispositivos + Software (por version_uuid)
    # Usamos try/except o verificamos columnas para evitar KeyError si df_software viene vacío pero con columnas raras
    if not df_software.empty and 'uuid' in df_software.columns:
        df_merged = df_devices.merge(
            df_software[['uuid', 'model_uuid']], 
            left_on='version_uuid', 
            right_on='uuid', 
            how='left', 
            suffixes=('', '_soft')
        )
    else:
        df_merged = df_devices.copy()
        df_merged['model_uuid'] = None

    # 3. Merge: Resultado + Modelos (por model_uuid)
    if not df_models.empty and 'uuid' in df_models.columns and 'model_uuid' in df_merged.columns:
        df_merge2 = df_merged.merge(
            df_models[['uuid', 'name']], 
            left_on='model_uuid', 
            right_on='uuid', 
            how='left', 
            suffixes=('', '_model_real')
        )
    else:
        df_merge2 = df_merged.copy()
        df_merge2['name_model_real'] = None

    if not df_ren.empty and 'uuid' in df_ren.columns:
        
        desired_columns = ['uuid', 'order_id', 'date_to_renew', 'renewal_diff', 'ki_subscription', 'state'] 

        valid_columns = [col for col in desired_columns if col in df_ren.columns]
        
        df_final = df_merge2.merge(
            df_ren[valid_columns],  # Seleccionamos las columnas validadas
            on='uuid',              # Cruzamos por uuid
            how='left',
            suffixes=('', '_ren')   # Si hay columnas repetidas, añade '_ren' al final
        )
    else:
        df_final = df_merge2.copy()

        print(df_final)

    # 5. Consolidar el nombre del modelo
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

# --- CORRECCIÓN: Agregado df_ren=None a la firma ---
def prepare_boards(data, df_models=None, df_soft=None, df_ren=None):
    """
    Prepara Boards. 
    """
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    # Aseguramos dataframes vacíos si vienen None
    df_models = df_models if df_models is not None else pd.DataFrame()
    df_soft = df_soft if df_soft is not None else pd.DataFrame()
    df_ren = df_ren if df_ren is not None else pd.DataFrame()

    # --- LÓGICA DE CRUCE DE MODELOS ---
    # Permitimos el merge aunque falte alguno, el helper _merge_model_info gestiona los vacíos
    try:
        # --- CORRECCIÓN: Se pasa df_ren correctamente ---
        df = _merge_model_info(df, df_soft, df_models, df_ren)
        df["model"] = df["real_model_name"]
    except Exception as e:
        print(f"⚠️ Error merging models: {e}")
        import traceback
        traceback.print_exc()
        df["model"] = "Genérico (Error Merge)"

    # --- LÓGICA DE ORGANIZACIÓN ---
    df["organization"] = df["final_client"].fillna("Sin Asignar") if "final_client" in df.columns else "Sin Asignar"

    # --- STATUS Y ENABLED ---
    col_state = "state" if "state" in df.columns else "status"

    df["status_clean"] = df[col_state].apply(_get_status_label) if col_state in df.columns else "Desconectado"
    df["enabled_clean"] = df[col_state].apply(_get_enabled_label) if col_state in df.columns else "Deshabilitado"

    # =========================================================================
    # EXPORTAR A EXCEL
    # =========================================================================
    try:
        # Nombre del archivo (se sobrescribirá cada vez que ejecutes)
        filename = "export_boards.xlsx"
        df.to_excel(filename, index=False)
        print(f"✅ Archivo exportado exitosamente: {filename}")
    except Exception as e:
        print(f"❌ No se pudo exportar el Excel (verifique permisos o instalación de openpyxl): {e}")

    # Conversión final para evitar NaN en JSON
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    return df

# -------------------------------------------------------------------------
# KIWI
# -------------------------------------------------------------------------
# --- CORRECCIÓN: Agregado df_ren=None y df_models=None por consistencia ---
def prepare_kiwi(data, df_models=None, df_soft=None, df_ren=None):
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    # Normalización de inputs
    df_soft = df_soft if df_soft is not None else pd.DataFrame()

    # --- LÓGICA DE CRUCE ---
    if not df_soft.empty and 'version_uuid' in df.columns:
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

    # =========================================================================
    # EXPORTAR A EXCEL
    # =========================================================================
    try:
        # Nombre del archivo (se sobrescribirá cada vez que ejecutes)
        filename = "export_boards.xlsx"
        df.to_excel(filename, index=False)
        print(f"✅ Archivo exportado exitosamente: {filename}")
    except Exception as e:
        print(f"❌ No se pudo exportar el Excel (verifique permisos o instalación de openpyxl): {e}")
        
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    return df