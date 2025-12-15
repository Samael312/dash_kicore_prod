# Archivo: main.py
from fastapi import FastAPI, HTTPException
import pandas as pd

# 1. Importamos el Cliente
from app.api_client import CoreClient

# 2. Importamos TUS funciones de lógica con sus nombres reales
from app.logic.data_device import prepare_boards, prepare_kiwi
from app.logic.data_info import process_devicesInfo
from app.logic.data_m2m import process_m2m

app = FastAPI()

# Instancia global del cliente
client = CoreClient()

@app.on_event("startup")
async def startup_event():
    """Login inicial al arrancar el servicio"""
    print("🚀 Iniciando Analytics Service...")
    if client.login():
        print("✅ Conectado a Core API")
    else:
        print("⚠️ No se pudo loguear al inicio (se reintentará en la petición)")

# ==========================================
# ENDPOINT 1: DEVICES (Boards)
# ==========================================
@app.get("/internal/dashboard/devices")
def get_devices_dashboard():
    # 1. Obtener datos crudos
    raw_devices = client.get_devicesB()
    raw_models = client.get_deviceModels()
    raw_software = client.get_deviceSoftware()

    if not raw_devices:
        return []

    # 2. Convertir auxiliares a DataFrame (prepare_boards los necesita así)
    df_models = pd.DataFrame(raw_models)
    df_soft = pd.DataFrame(raw_software)

    # 3. Procesar (prepare_boards acepta lista o DF en el primer argumento)
    try:
        df_final = prepare_boards(
            raw_devices, 
            df_models=df_models, 
            df_soft=df_soft
        )
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 1.1: DEVICES KIWI (Extra)
# ==========================================
@app.get("/internal/dashboard/kiwi")
def get_kiwi_dashboard():
    raw_kiwi = client.get_devicesKiwi()
    raw_software = client.get_deviceSoftware() # Kiwi usa versiones de software para el modelo

    if not raw_kiwi:
        return []

    df_soft = pd.DataFrame(raw_software)

    try:
        # Usamos tu función prepare_kiwi
        df_final = prepare_kiwi(raw_kiwi, df_soft=df_soft)
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Kiwi: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 2: INFO
# ==========================================
@app.get("/internal/dashboard/info")
def get_info_dashboard():
    # 1. Obtener datos crudos
    raw_info = client.get_deviceInfo()
    
    # 2. Procesar
    # Tu función process_devicesInfo espera el JSON/Lista cruda, NO un DataFrame
    try:
        df_final = process_devicesInfo(raw_info)
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en Info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# ENDPOINT 3: M2M
# ==========================================
@app.get("/internal/dashboard/m2m")
def get_m2m_dashboard():
    # 1. Obtener datos crudos
    raw_m2m = client.get_m2m()

    # 2. Procesar
    # Tu función process_m2m espera el JSON/Lista cruda
    try:
        df_final = process_m2m(raw_m2m)
        return df_final.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Error en M2M: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)