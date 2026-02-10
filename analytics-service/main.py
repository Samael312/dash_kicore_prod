# Archivo: main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # <--- NECESARIO PARA EL BODY DEL POST
import pandas as pd
import numpy as np
import math

# 1. Imports de tu proyecto
from app.api_client import CoreClient
from app.logic.data_device import prepare_boards, prepare_kiwi
from app.logic.data_info import process_devicesInfo
from app.logic.data_m2m import process_m2m
from app.logic.data_pool import process_pools
from app.logic.data_renewal import process_renewals_logic

# Instancia global del cliente
client = CoreClient()
class HistoryRequest(BaseModel):
    start_date: str # Debería ser formato YYYY-MM-DD
    end_date: str   # Debería ser formato YYYY-MM-DD
    monthly: bool

# 2. DEFINICIÓN DEL LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando Analytics Service...")
    if client.login():
        print("✅ Conectado a Core API")
    else:
        print("⚠️ No se pudo loguear al inicio")
    yield
    print("🛑 Apagando servicio...")

app = FastAPI(lifespan=lifespan)

# ==========================================
# 3. CONFIGURACIÓN CORS
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS PYDANTIC ---
class HistoryRequest(BaseModel):
    start_date: str
    end_date: str
    monthly: bool

# --- HELPER "NUCLEAR" PARA LIMPIAR NaN ---
def clean_df(df):
    """
    Convierte todo a objetos y elimina NaN.
    """
    if df.empty:
        return df
    
    df_obj = df.astype(object)
    df_obj_clean = df_obj.where(pd.notnull(df_obj), None)
    return df_obj_clean

# --- HELPER PARA PAGINACIÓN ---
def paginate_df(df: pd.DataFrame, limit: int, offset: int):
    """
    Aplica la lógica de limit y offset sobre un DataFrame.
    """
    if df.empty:
        return df
    
    if offset >= len(df):
        return pd.DataFrame(columns=df.columns)
    
    return df.iloc[offset : offset + limit]

# ==========================================
# ENDPOINT 1: DEVICES (Boards)
# ==========================================
@app.get("/internal/dashboard/devices")
def get_devices_dashboard(
    limit: int = Query(5000, ge=1, description="Cantidad de registros a traer"),
    offset: int = Query(0, ge=0, description="Desde qué registro empezar")
):
    raw_devices = client.get_devicesB()
    raw_models = client.get_deviceModels()
    raw_software = client.get_deviceSoftware()

    if not raw_devices:
        return []

    df_models = pd.DataFrame(raw_models)
    df_soft = pd.DataFrame(raw_software)

    try:
        # Lógica de negocio
        df_final = prepare_boards(raw_devices, df_models=df_models, df_soft=df_soft)
        
        # Limpieza 
        df_final = clean_df(df_final)
        
        # Paginación
        df_final = paginate_df(df_final, limit, offset)
        
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Devices: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 1.1: DEVICES KIWI
# ==========================================
@app.get("/internal/dashboard/kiwi")
def get_kiwi_dashboard(
    limit: int = Query(5000, ge=1),
    offset: int = Query(0, ge=0)
):
    raw_kiwi = client.get_devicesKiwi()
    raw_software = client.get_deviceSoftware()
    
    if not raw_kiwi:
        return []

    df_soft = pd.DataFrame(raw_software)

    try:
        df_final = prepare_kiwi(raw_kiwi, df_soft=df_soft)
        df_final = clean_df(df_final)
        
        # Paginación
        df_final = paginate_df(df_final, limit, offset)
        
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Kiwi: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 2: INFO
# ==========================================
@app.get("/internal/dashboard/info")
def get_info_dashboard(
    limit: int = Query(5000, ge=1),
    offset: int = Query(0, ge=0)
):
    raw_info = client.get_deviceInfo()
    try:
        df_final = process_devicesInfo(raw_info)
        df_final = clean_df(df_final)
        
        df_final = paginate_df(df_final, limit, offset)
        
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Info: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 3: M2M
# ==========================================
@app.get("/internal/dashboard/m2m")
def get_m2m_dashboard(
    limit: int = Query(5000, ge=1),
    offset: int = Query(0, ge=0)
):
    raw_m2m = client.get_m2m()
    try:
        df_final = process_m2m(raw_m2m)
        df_final = clean_df(df_final)
        
        df_final = paginate_df(df_final, limit, offset)
        
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en M2M: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 3.1: M2M HISTORY (INDIVIDUAL)
# ==========================================
@app.post("/internal/dashboard/m2m/{icc}/history")
def get_m2m_history_dashboard(
    icc: str,
    payload: HistoryRequest
):
    try:
        clean_icc = icc.strip()
        print(f"🔎 Consultando historial para ICC: {clean_icc}")
        
        # Validación básica de fechas para evitar el error "Error en la operación"
        if "string" in payload.start_date or not payload.start_date:
             raise HTTPException(status_code=400, detail="Debes enviar fechas reales (YYYY-MM-DD), no 'string'")

        data = client.get_m2m_history(clean_icc, payload.model_dump())
        return data

    except ValueError as ve:
        # Capturamos el error lógico de Kiconex
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ Error Server: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# ==========================================
# ENDPOINT 4: POOLS
# ==========================================
@app.get("/internal/dashboard/pools")
def get_pools_dashboard(
    limit: int = Query(5000, ge=1),
    offset: int = Query(0, ge=0)
):
    raw_pool = client.get_pools()
    try:
        df_pool = process_pools(raw_pool)
        df_pool = clean_df(df_pool)
        
        df_pool_paginated = paginate_df(df_pool, limit, offset)
        
        return df_pool_paginated.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Pools: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 5: RENEWALS
# ==========================================
@app.get("/internal/dashboard/renewals")
def get_renewals_dashboard(
    limit: int = Query(5000, ge=1),
    offset: int = Query(0, ge=0),
    show_all: bool = Query(True),
    from_date: str = Query(None),
    to: str = Query(None) 
):
    # A. Obtenemos datos crudos
    raw_ren = client.get_deviceRenewals(show_all=show_all, from_date=from_date, to=to)
    raw_devices = client.get_devicesB()
    raw_models = client.get_deviceModels()
    raw_software = client.get_deviceSoftware() 

    try:
        # C. Procesamos con la nueva lógica (incluyendo software)
        renewals_data = process_renewals_logic(
            raw_ren, 
            raw_devices, 
            raw_models, 
            raw_software 
        )
        
        # D. Paginación manual sobre la lista resultante
        total_items = len(renewals_data)
        if offset >= total_items:
             paginated_data = []
        else:
             end = offset + limit
             paginated_data = renewals_data[offset:end]
        
        return paginated_data

    except Exception as e:
        print(f"❌ Error en Renewals: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)