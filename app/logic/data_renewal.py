import pandas as pd
import numpy as np

def _clean_uuid(series):
    """Ayuda a limpiar UUIDs para asegurar el cruce (lowercase + strip)"""
    if series.empty:
        return series
    return series.astype(str).str.strip().str.lower()

def _get_status_label(val):
    
    s = str(val).lower().strip() if val is not None else ""
    
    # Diccionario de estados: Valor de entrada -> Etiqueta de salida
    status_map = {
        "active": "Activa",
        "inactive": "Inactiva",
        "cancelled": "Cancelada",
        "not-applicable": "No Aplicable",
    }
    
    return status_map.get(s, "Inactive")

def process_renewals_logic(raw_ren, raw_devices, raw_models, raw_software):
    """
    Lógica optimizada para cruzar:
    Renovaciones -> Dispositivos -> (vía version_uuid) -> Software -> (vía model_uuid) -> Modelos
    """
    
    # ---------------------------------------------------------
    # 1. CARGAR RENOVACIONES (Base)
    # ---------------------------------------------------------
    if not raw_ren:
        return []
    
    df_ren = pd.DataFrame(raw_ren)
    if df_ren.empty:
        return []

    # Normalización de Fechas
    if 'date_to_renew' in df_ren.columns:
        df_ren['date_to_renew'] = pd.to_datetime(df_ren['date_to_renew'], errors='coerce')
        df_ren['date_to_renew'] = df_ren['date_to_renew'].dt.strftime('%Y-%m-%d')

    # Limpieza de UUID base
    if 'uuid' in df_ren.columns:
        df_ren['uuid'] = _clean_uuid(df_ren['uuid'])

    # ---------------------------------------------------------
    # 2. PREPARAR DISPOSITIVOS
    # ---------------------------------------------------------
    if not raw_devices:
        return _clean_and_return(df_ren)

    try:
        df_devices = pd.DataFrame(raw_devices)
        if df_devices.empty:
            return _clean_and_return(df_ren)

        # Limpieza UUID Dispositivo
        if 'uuid' in df_devices.columns:
            df_devices['uuid'] = _clean_uuid(df_devices['uuid'])
        
        # Limpieza Foreign Key hacia Software (version_uuid)
        if 'version_uuid' in df_devices.columns:
            df_devices['version_uuid'] = _clean_uuid(df_devices['version_uuid'])

        # Inicializar real_model_name
        df_devices['real_model_name'] = 'Desconocido'

        # ---------------------------------------------------------
        # 3. CRUCE EN CADENA (Devices -> Software -> Models)
        # ---------------------------------------------------------
        
        # Validamos que tengamos Software y Modelos
        has_software = raw_software and len(raw_software) > 0
        has_models = raw_models and len(raw_models) > 0

        if has_software and has_models:
            # A. PREPARAR DATAFRAMES AUXILIARES
            df_soft = pd.DataFrame(raw_software)
            df_mod = pd.DataFrame(raw_models)

            # Limpieza claves Software
            if 'uuid' in df_soft.columns: df_soft['uuid'] = _clean_uuid(df_soft['uuid'])
            fk_col_soft = 'model_uuid' if 'model_uuid' in df_soft.columns else 'model' 
            if fk_col_soft in df_soft.columns:
                 df_soft[fk_col_soft] = _clean_uuid(df_soft[fk_col_soft])

            # Limpieza claves Modelos
            if 'uuid' in df_mod.columns: df_mod['uuid'] = _clean_uuid(df_mod['uuid'])

            # B. MERGE 1: Dispositivos + Software (Usando version_uuid -> uuid)
   
            cols_soft = ['uuid', fk_col_soft]
            # Filtramos columnas existentes
            cols_soft = [c for c in cols_soft if c in df_soft.columns]

            df_merged_step1 = df_devices.merge(
                df_soft[cols_soft],
                left_on='version_uuid',
                right_on='uuid',
                how='left',
                suffixes=('', '_soft')
            )

            # C. MERGE 2: Resultado + Modelos (Usando model_uuid -> uuid)
        
            cols_mod = ['uuid', 'name']
            cols_mod = [c for c in cols_mod if c in df_mod.columns]
            
            # Renombramos 'name' a 'model_label' para evitar colisiones
            df_mod_clean = df_mod[cols_mod].rename(columns={'name': 'model_label'})

          
            
            df_merged_final = df_merged_step1.merge(
                df_mod_clean,
                left_on=fk_col_soft, # columna que vino del software
                right_on='uuid',
                how='left'
            )

            # Asignamos el nombre encontrado
            df_devices['real_model_name'] = df_merged_final['model_label'].fillna('Desconocido')

        # ---------------------------------------------------------
        # 4. FALLBACK INTELIGENTE 
        # ---------------------------------------------------------
        mask_unknown = df_devices['real_model_name'] == 'Desconocido'
        
        # Fallback 1: Columna 'model' en devices
        if 'model' in df_devices.columns:
            df_devices.loc[mask_unknown, 'real_model_name'] = df_devices.loc[mask_unknown, 'model']
        
        # Fallback 2: SSID (específico para casos Kiwi/genéricos)
        if 'ssid' in df_devices.columns:
             mask_still_unknown = df_devices['real_model_name'].isin(['Desconocido', None, np.nan])
             df_devices.loc[mask_still_unknown, 'real_model_name'] = df_devices.loc[mask_still_unknown, 'ssid']

        # ---------------------------------------------------------
        # 5. CRUCE FINAL: Renovaciones -> Dispositivos
        # ---------------------------------------------------------
        cols_to_merge = ['uuid', 'name', 'real_model_name', 'organization', 'final_client']
        cols_existing = [c for c in cols_to_merge if c in df_devices.columns]

        df_final = df_ren.merge(
            df_devices[cols_existing],
            on='uuid',
            how='left',
            suffixes=('_ren', '_device')
        )

        # Rellenar vacíos finales
        if 'real_model_name' in df_final.columns:
            df_final['real_model_name'] = df_final['real_model_name'].fillna('Dispositivo no encontrado')
            df_final['model'] = df_final['real_model_name']
        else:
            df_final['real_model_name'] = 'Desconocido'
            df_final['model'] = 'Desconocido'

        # Lógica de Estado
        if 'ki_subscription_state' not in df_final.columns:
             if 'ki_subscription_name' in df_final.columns:
                 df_final['ki_subscription_state'] = df_final['ki_subscription_name']
             else:
                 df_final['ki_subscription_state'] = 'Sin Suscripción'

        df_final['ki_subscription_state'] = df_final['ki_subscription_state'].apply(_get_status_label)

        return _clean_and_return(df_final)
    
       

    except Exception as e:
        print(f"⚠️ Error procesando renewals: {e}")
        import traceback
        traceback.print_exc()
        return _clean_and_return(df_ren)

def _clean_and_return(df):
    """Limpia NaNs y convierte a lista de dicts"""
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")