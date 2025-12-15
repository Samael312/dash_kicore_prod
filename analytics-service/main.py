# Archivo: main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import math

# 1. Imports de tu proyecto
from app.api_client import CoreClient
from app.logic.data_device import prepare_boards, prepare_kiwi
from app.logic.data_info import process_devicesInfo
from app.logic.data_m2m import process_m2m

# Instancia global del cliente
client = CoreClient()

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

# --- HELPER "NUCLEAR" PARA LIMPIAR NaN ---
def clean_df(df):
    """
    Convierte todo a objetos y elimina NaN.
    Esta es la solución definitiva para el error 'float values are not JSON compliant'.
    """
    if df.empty:
        return df
    
    df_obj = df.astype(object)
    
    df_obj_clean =df_obj.where(pd.notnull(df_obj), None)
    #print(df_obj_clean)
    
    return df_obj_clean


# ==========================================
# ENDPOINT 1: DEVICES (Boards)
# ==========================================
@app.get("/internal/dashboard/devices")
def get_devices_dashboard():
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
        df_final = df_final.head(100)
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
def get_kiwi_dashboard():
    raw_kiwi = client.get_devicesKiwi()
    raw_software = client.get_deviceSoftware()

    if not raw_kiwi:
        return []

    df_soft = pd.DataFrame(raw_software)

    try:
        df_final = prepare_kiwi(raw_kiwi, df_soft=df_soft)
        df_final = clean_df(df_final)
        df_final = df_final.head(100)
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
def get_info_dashboard():
    raw_info = client.get_deviceInfo()
    try:
        df_final = process_devicesInfo(raw_info)
        df_final = clean_df(df_final)
        df_final = df_final.head(100)
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
def get_m2m_dashboard():
    raw_m2m = client.get_m2m()
    try:
        df_final = process_m2m(raw_m2m)
        df_final = clean_df(df_final)
        df_final = df_final.head(100)
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en M2M: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)