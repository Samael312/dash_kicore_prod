import pandas as pd
import re

def _clean_uuid(series):
    """Ayuda a limpiar UUIDs para asegurar el cruce (lowercase + strip)"""
    if series.empty:
        return series
    return series.astype(str).str.strip().str.lower()

# -------------------------------------------------------------------------
# NORMALIZACIÓN DE ORGANIZACIÓN
# -------------------------------------------------------------------------

# Mapa de palabras clave → nombre canónico (en UPPER)
_ORG_KEYWORD_MAP = [
    ('intarcon',  'INTARCON'),
    ('genaq',     'GENAQ'),
    ('keyter',    'KEYTER'),
    ('kiconex',   'KICONEX'),
    ('keytarcon', 'KEYTER'),   # variante combinada
    ('konecranes','KONECRANES'),
    ('hiperbaric', 'HIPERBARIC'),
    ('cofrisa',   'COFRISA'),
    ('fagor',     'FAGOR INDUSTRIAL'),
    ('cunovesa',  'CUNOVESA'),
    ('pureair',   'PUREAIR'),
    ('pure air',  'PUREAIR'),
    ('scandia',   'SCANDIA REFRIGERATION'),
    ('airmaster', 'AIRMASTER'),
    ('clauger',   'CLAUGER'),
    ('scotsman',  'SCOTSMAN'),
    ('infrico',   'INFRICO'),
    ('calvera',   'CALVERA HYDROGEN'),
    ('fb intec',  'FB INTEC'),
    ('fbintec',   'FB INTEC'),
    ('ebrofrio',  'EBROFRIO'),
    ('refrimaster','REFRIMASTER'),
    ('frigidaire', 'FRIGIDAIRE'),
    ('cofrisa',   'COFRISA'),
    ('rioma',     'RIOMA'),
    ('pilsa',     'PILSA'),
    ('andaltec',  'ANDALTEC'),
    ('smartfrius','SMARTFRIUS'),
    ('tecfrisa',  'TECFRISA'),
    ('dicoma',    'DICOMA REFRIGERACIÓN'),
    ('enfrio',    'ENFRIO SOLUCIONES'),
    ('sermain',   'SERMAIN'),
    ('totelsa',   'TOTELSA'),
    ('fm grupo',  'FM GRUPO TECNOLOGICO'),
    ('algis',     'ALGIS CLIMA'),
    ('polifret',  'POLIFRET'),
    ('poima',     'POIMA BALEAR'),
    ('solingen',  'SOLINGEN FACILITIES'),
    ('bestfriger','BESTFRIGER'),
    ('impafri',   'IMPAFRI'),
    ('jafrisur',  'JAFRISUR'),
    ('inmeci',    'INMECI REFRIGERACION'),
    ('gesman',    'GESMAN SOLUCIONES'),
    ('tesla',     'GRUPO TESLA'),
    ('rebkey',    'REBKEY'),
    ('greencool', 'GREENCOOL DEVELOPMENT'),
    ('coolrite',  'COOLRITE'),
    ('coldtech',  'COLDTECH IBÉRICA'),
    ('humiclima', 'HUMICLIMA NORTE'),
    ('americapital','AMERICAPITAL'),
    ('ovgescan',  'GRUPO OVGESCAN ENERGY'),
    ('hispacold', 'INTERNACIONAL HISPACOLD'),
    ('vallafrío', 'VALLAFRÍO'),
    ('vallafrio', 'VALLAFRÍO'),
    ('garnacho',  'FRIO INDUSTRIAL GARNACHO'),
    ('llufriu',   'LLUFRIU REFRIGERACION'),
    ('brune',     'BRUNEL UNIVERSITY'),
    ('nordic',    'NORDIC KØLESERVICE'),
    ('sat frigus','SAT FRIGUS'),
    ('orcha',     'ORCHA'),
    ('sotorrental','SOTORRENTAL'),
    ('e-cold',    'E-COLD'),
    ('advance 71','ADVANCE 71'),
    ('ceis',      'CEIS'),
    ('seguas',    'SEGUAS'),
    ('uma',       'UMA'),
    ('saji',      'SAJI'),
]

def normalize_organization(raw: str) -> str:
    """
    Normaliza el nombre de una organización:
    1. Limpia espacios/tabs y convierte a minúsculas para comparar
    2. Busca palabras clave en orden (más específica primero)
    3. Si no hay match, devuelve el valor en UPPER limpio
    """
    if not raw or str(raw).strip() in ('', 'None', 'nan'):
        return 'SIN ASIGNAR'

    cleaned = str(raw).strip()
    lower = cleaned.lower()

    for keyword, canonical in _ORG_KEYWORD_MAP:
        if keyword in lower:
            return canonical

    # Sin match: devolver en UPPER normalizado
    return re.sub(r'\s+', ' ', cleaned).upper()


def _normalize_org_series(series: pd.Series) -> pd.Series:
    return series.apply(normalize_organization)


def _merge_model_info(df_devices, df_software, df_models):
    """
    Función auxiliar para cruzar Dispositivos -> Software -> Modelos
    """
    if df_devices.empty:
        return df_devices

    if 'version_uuid' in df_devices.columns:
        df_devices['version_uuid'] = _clean_uuid(df_devices['version_uuid'])

    if not df_software.empty:
        if 'uuid' in df_software.columns:
            df_software['uuid'] = _clean_uuid(df_software['uuid'])
        if 'model_uuid' in df_software.columns:
            df_software['model_uuid'] = _clean_uuid(df_software['model_uuid'])

    if not df_models.empty:
        if 'uuid' in df_models.columns:
            df_models['uuid'] = _clean_uuid(df_models['uuid'])

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

    if 'model_uuid' in df_merged.columns:
        df_merged['model_uuid'] = _clean_uuid(df_merged['model_uuid'])

    if not df_models.empty and 'uuid' in df_models.columns and 'model_uuid' in df_merged.columns:
        df_final = df_merged.merge(
            df_models[['uuid', 'name']],
            left_on='model_uuid',
            right_on='uuid',
            how='left',
            suffixes=('', '_model_real')
        )
    else:
        df_final = df_merged.copy()
        df_final['name_model_real'] = None

    if 'name_model_real' in df_final.columns:
        df_final['real_model_name'] = df_final['name_model_real'].fillna('Desconocido')
    else:
        df_final['real_model_name'] = 'Desconocido'

    return df_final


def _get_status_label(val):
    s = str(val).lower()
    return "Terminado" if s in ["terminado", "online", "connected", "true"] else "Sin Terminar"


# -------------------------------------------------------------------------
# BOARDS
# -------------------------------------------------------------------------
def prepare_boards(data, df_models=None, df_soft=None):
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    df_models = df_models if df_models is not None else pd.DataFrame()
    df_soft = df_soft if df_soft is not None else pd.DataFrame()

    # --- MODELO ---
    try:
        df = _merge_model_info(df, df_soft, df_models)
        df["model"] = df["real_model_name"]
    except Exception as e:
        print(f"⚠️ Error merging models: {e}")
        import traceback
        traceback.print_exc()
        df["model"] = "Genérico (Error Merge)"

    # --- ORGANIZACIÓN (normalizada) ---
    raw_org = df["final_client"] if "final_client" in df.columns else pd.Series(["Sin Asignar"] * len(df))
    df["organization"] = _normalize_org_series(raw_org)

    # --- STATUS ---
    col_state = "state" if "state" in df.columns else "status"
    df["status_clean"] = df[col_state].apply(_get_status_label) if col_state in df.columns else "Desconectado"

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

    df_soft = df_soft if df_soft is not None else pd.DataFrame()

    # --- MODELO ---
    if not df_soft.empty and 'version_uuid' in df.columns:
        try:
            df['version_uuid'] = _clean_uuid(df['version_uuid'])

            df_soft_clean = df_soft.copy()
            if 'uuid' in df_soft_clean.columns:
                df_soft_clean['uuid'] = _clean_uuid(df_soft_clean['uuid'])

            df_soft_ready = df_soft_clean[['uuid', 'name']].rename(columns={'name': 'software_name'})
            df_soft_ready = df_soft_ready.drop_duplicates(subset=['uuid'])

            df_merged = df.merge(
                df_soft_ready,
                left_on='version_uuid',
                right_on='uuid',
                how='left'
            )

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

    # --- ORGANIZACIÓN (normalizada) ---
    raw_org = df["final_client"] if "final_client" in df.columns else pd.Series(["Sin Asignar"] * len(df))
    df["organization"] = _normalize_org_series(raw_org)

    # --- STATUS ---
    col_state = "state" if "state" in df.columns else "status"
    df["status_clean"] = df[col_state].apply(_get_status_label) if col_state in df.columns else "Sin Terminar"

    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    return df