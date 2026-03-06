import sys
import os
from datetime import datetime
import json

# Añadir la raíz del proyecto al path para poder importar desde 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.cloud_client import CloudClient
from app.database import DatabaseAdapter

# Mapeo de constantes de Kiconex
TYPE_LINK = 1
TYPE_ENTITY = 2
TYPE_SIM = 3

def categorize_alarms(alarms):
    stats = {
        'disconnected_device': 0,
        'disconnected_control': 0,
        'parameters': 0,
        'sim_high': 0,
        'sim_critical': 0
    }
    
    if not isinstance(alarms, list):
        print("⚠️ Formato de respuesta inesperado (se esperaba lista).")
        return stats

    for alarm in alarms:
        # Filtro: solo procesar alarmas activas (state == 1)
        if alarm.get('alarm_state') != 1:
            continue

        a_type = alarm.get('alarm_type')
        a_control = alarm.get('alarm_control_uuid')
        a_severity = alarm.get('alarm_severity')

        if a_type == TYPE_LINK:
            if not a_control:
                stats['disconnected_device'] += 1
            else:
                stats['disconnected_control'] += 1
        elif a_type == TYPE_ENTITY:
            stats['parameters'] += 1
        elif a_type == TYPE_SIM:
            if a_severity == 'sim-high':
                stats['sim_high'] += 1
            elif a_severity == 'sim-critical':
                stats['sim_critical'] += 1

    return stats

def save_to_db(stats):
    db = DatabaseAdapter()
    query = """
        INSERT INTO alarm_counts 
        (disconnected_device, disconnected_control, parameters, sim_high, sim_critical, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    values = (
        stats['disconnected_device'],
        stats['disconnected_control'],
        stats['parameters'],
        stats['sim_high'],
        stats['sim_critical'],
        datetime.now()
    )
    
    try:
        db.execute_query(query, values)
        print(f"✅ [{datetime.now()}] Persistencia en BD exitosa.")
    except Exception as e:
        print(f"❌ Fallo al guardar en BD: {e}")

if __name__ == "__main__":
    # Uso del nuevo CloudClient
    client = CloudClient()
    data = client.get_alarms(state="1,2")
    
    if data:
        results = categorize_alarms(data)
        print(f"📊 Resumen de Categorización:")
        print(json.dumps(results, indent=2))
        save_to_db(results)
    else:
        print("⚠️ No hay datos para procesar.")
