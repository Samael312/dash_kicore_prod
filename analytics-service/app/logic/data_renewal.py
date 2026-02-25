import pandas as pd
import numpy as np

# ----------------------------
# Helpers
# ----------------------------
def _clean_uuid(series: pd.Series) -> pd.Series:
    if series is None or series.empty:
        return series
    return series.astype(str).str.strip().str.lower()

def _clean_str(series: pd.Series) -> pd.Series:
    if series is None or series.empty:
        return series
    return series.astype(str).str.strip()

def _to_date_yyyy_mm_dd(df: pd.DataFrame, col: str):
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d")
        # Aseguramos que los nulos no se queden como el string "NaT"
        df[col] = df[col].replace("NaT", None).replace("nan", None)

def _clean_and_return(df: pd.DataFrame):
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")

def _status_label(val) -> str:
    s = str(val).lower().strip() if val is not None else ""
    mapping = {
        "active": "Activa",
        "inactive": "Inactiva",
        "cancelled": "Cancelada",
        "not-applicable": "No aplicable",
        "not applicable": "No aplicable",
        "unknown": "Desconocido",
        "desconocido": "Desconocido",
    }
    return mapping.get(s, "Desconocido")

# ----------------------------
# Enriquecimiento común: uuid -> devices -> software -> models
# ----------------------------
def _enrich_devices_models(df_base: pd.DataFrame, raw_devices, raw_models, raw_software) -> pd.DataFrame:
    if df_base is None or df_base.empty:
        return pd.DataFrame()

    df_out = df_base.copy()

    # Normaliza uuid en base
    if "uuid" in df_out.columns:
        df_out["uuid"] = _clean_uuid(df_out["uuid"])

    if not raw_devices:
        df_out["model_name"] = "Dispositivo no encontrado"
        df_out["final_client"] = None
        return df_out

    df_devices = pd.DataFrame(raw_devices)
    if df_devices.empty:
        df_out["model_name"] = "Dispositivo no encontrado"
        df_out["final_client"] = None
        return df_out

    # Limpieza claves
    if "uuid" in df_devices.columns:
        df_devices["uuid"] = _clean_uuid(df_devices["uuid"])
    if "version_uuid" in df_devices.columns:
        df_devices["version_uuid"] = _clean_uuid(df_devices["version_uuid"])

    # Resolver model_name via software->models
    df_devices["model_name"] = "Desconocido"

    if raw_software and raw_models:
        df_soft = pd.DataFrame(raw_software)
        df_mod = pd.DataFrame(raw_models)

        if not df_soft.empty and not df_mod.empty:
            if "uuid" in df_soft.columns:
                df_soft["uuid"] = _clean_uuid(df_soft["uuid"])

            fk_col_soft = (
                "model_uuid" if "model_uuid" in df_soft.columns
                else ("model" if "model" in df_soft.columns else None)
            )
            if fk_col_soft and fk_col_soft in df_soft.columns:
                df_soft[fk_col_soft] = _clean_uuid(df_soft[fk_col_soft])

            if "uuid" in df_mod.columns:
                df_mod["uuid"] = _clean_uuid(df_mod["uuid"])

            # devices + software (version_uuid -> soft.uuid)
            cols_soft = [c for c in ["uuid", fk_col_soft] if c and c in df_soft.columns]
            df_step1 = df_devices.merge(
                df_soft[cols_soft],
                left_on="version_uuid",
                right_on="uuid",
                how="left",
                suffixes=("", "_soft"),
            )

            # + models (soft.model_uuid -> models.uuid)
            cols_mod = [c for c in ["uuid", "name"] if c in df_mod.columns]
            df_mod_clean = df_mod[cols_mod].rename(columns={"name": "model_label"})

            if fk_col_soft:
                df_chain = df_step1.merge(
                    df_mod_clean,
                    left_on=fk_col_soft,
                    right_on="uuid",
                    how="left",
                )
                df_devices["model_name"] = df_chain["model_label"].fillna("Desconocido")

    # Fallbacks de model_name desde devices
    mask_unknown = df_devices["model_name"] == "Desconocido"
    if "model" in df_devices.columns:
        df_devices.loc[mask_unknown, "model_name"] = df_devices.loc[mask_unknown, "model"]
    if "ssid" in df_devices.columns:
        mask_still = df_devices["model_name"].isin(["Desconocido", None, np.nan])
        df_devices.loc[mask_still, "model_name"] = df_devices.loc[mask_still, "ssid"]

   # Reemplaza las últimas líneas de _enrich_devices_models por esto:
    cols_dev = ["uuid", "model_name", "final_client", "name", "organization"]
    cols_dev = [c for c in cols_dev if c in df_devices.columns]

    df_out = df_out.merge(df_devices[cols_dev], on="uuid", how="left", suffixes=("", "_device"))

    # CORRECCIÓN DE FILLNA PARA EVITAR AttributeError
    if "model_name" not in df_out.columns:
        df_out["model_name"] = "Dispositivo no encontrado"
    else:
        df_out["model_name"] = df_out["model_name"].fillna("Dispositivo no encontrado")

    if "final_client" not in df_out.columns:
        df_out["final_client"] = None

    return df_out

# ----------------------------
# m2m renewals: añade cruce por ICC con get_m2m para nombre SIM/M2M
# ----------------------------
def process_m2m_renewals_logic(raw_m2m_ren, raw_m2m, raw_devices, raw_models, raw_software):
    """
    Output incluye (si existen):
    - order_id, uuid, icc, renewal_date, renewal_interval, date_to_renew, renewal_diff, tenant_uuid, state, ki_subscription_state
    - model_name, final_client  (por uuid -> devices)
    - m2m_name (por icc -> get_m2m)
    - ki_subscription_name (si viene en raw)
    """
    if not raw_m2m_ren:
        return []

    df = pd.DataFrame(raw_m2m_ren)
    if df.empty:
        return []

    # Normalizaciones base
    if "uuid" in df.columns:
        df["uuid"] = _clean_uuid(df["uuid"])
    if "icc" in df.columns:
        df["icc"] = _clean_str(df["icc"])

    _to_date_yyyy_mm_dd(df, "renewal_date")
    _to_date_yyyy_mm_dd(df, "date_to_renew")

    # ki_subscription_name: cliente (si no existe, lo dejamos)
    if "ki_subscription_name" not in df.columns:
        df["ki_subscription_name"] = None

    # state: si no existe -> Desconocido
    if "state" not in df.columns:
        df["state"] = "Desconocido"
    df["state"] = df["state"].fillna("Desconocido").replace("", "Desconocido")
    df["state_label"] = df["state"].apply(_status_label)

    # ki_subscription_state: si no existe -> Desconocido (NO usar name)
    if "ki_subscription_state" not in df.columns:
        df["ki_subscription_state"] = "Desconocido"
    df["ki_subscription_state"] = df["ki_subscription_state"].fillna("Desconocido").replace("", "Desconocido")
    df["ki_subscription_state_label"] = df["ki_subscription_state"].apply(_status_label)

    # Enriquecer con devices/models
    df = _enrich_devices_models(df, raw_devices, raw_models, raw_software)

    # Cruce ICC -> get_m2m para nombre SIM/M2M
    df["m2m_name"] = None
    if raw_m2m and "icc" in df.columns:
        df_m2m = pd.DataFrame(raw_m2m)
        if not df_m2m.empty:
            # Normaliza icc en tabla m2m
            for icc_col in ["icc", "ICC", "sim_icc", "sim_iccid", "iccid"]:
                if icc_col in df_m2m.columns:
                    df_m2m = df_m2m.rename(columns={icc_col: "icc"})
                    break
            if "icc" in df_m2m.columns:
                df_m2m["icc"] = _clean_str(df_m2m["icc"])

                # Detecta columna nombre
                name_col = None
                for c in ["name", "m2m_name", "sim_name", "alias", "description"]:
                    if c in df_m2m.columns:
                        name_col = c
                        break

                if name_col:
                    df_m2m_small = df_m2m[["icc", name_col]].rename(columns={name_col: "m2m_name"})
                    df = df.merge(df_m2m_small, on="icc", how="left", suffixes=("", "_m2m"))
                    # si por colisión queda m2m_name duplicado
                    if "m2m_name_m2m" in df.columns:
                        df["m2m_name"] = df["m2m_name_m2m"]
                        df = df.drop(columns=["m2m_name_m2m"])

    return _clean_and_return(df)

# ----------------------------
# plan renewals: no cruza por ICC; sólo devices/models
# ----------------------------
def process_plan_renewals_logic(raw_plan_ren, raw_devices, raw_models, raw_software):
    """
    Output incluye (si existen):
    - order_id, uuid, renewal_date, renewal_interval, date_to_renew, renewal_diff, tenant_uuid, state, ki_subscription_state, ki_subscription_name
    - model_name, final_client (por uuid -> devices)
    """
    if not raw_plan_ren:
        return []

    df = pd.DataFrame(raw_plan_ren)
    if df.empty:
        return []

    if "uuid" in df.columns:
        df["uuid"] = _clean_uuid(df["uuid"])

    _to_date_yyyy_mm_dd(df, "renewal_date")
    _to_date_yyyy_mm_dd(df, "date_to_renew")

    # ki_subscription_name: cliente (si no existe, lo dejamos)
    if "ki_subscription_name" not in df.columns:
        df["ki_subscription_name"] = None

    # state: si no existe -> Desconocido
    if "state" not in df.columns:
        df["state"] = "Desconocido"
    df["state"] = df["state"].fillna("Desconocido").replace("", "Desconocido")
    df["state_label"] = df["state"].apply(_status_label)

    # ki_subscription_state: si no existe -> Desconocido (NO usar name)
    if "ki_subscription_state" not in df.columns:
        df["ki_subscription_state"] = "Desconocido"
    df["ki_subscription_state"] = df["ki_subscription_state"].fillna("Desconocido").replace("", "Desconocido")
    df["ki_subscription_state_label"] = df["ki_subscription_state"].apply(_status_label)

    df = _enrich_devices_models(df, raw_devices, raw_models, raw_software)

    return _clean_and_return(df)