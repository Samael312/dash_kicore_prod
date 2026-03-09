import mysql.connector
from app.config.settings import Settings

class DatabaseAdapter:
    def __init__(self):
        self.config = {
            'host': Settings.DB_HOST,
            'database': Settings.DB_NAME,
            'user': Settings.DB_USER,
            'password': Settings.DB_PASS
        }
    
    def get_connection(self):
        try:
            conn = mysql.connector.connect(**self.config)
            return conn
        except mysql.connector.Error as err:
            print(f"❌ Error al conectar a la Base de Datos: {err}")
            raise err

    def execute_query(self, query, values=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if values:
                cursor.execute(query, values)
            else:
                cursor.execute(query)
            conn.commit()
            return cursor
        except mysql.connector.Error as err:
            print(f"❌ Error en la consulta: {err}")
            conn.rollback()
            raise err
        finally:
            cursor.close()
            conn.close()

    def get_latest_counts(self):
        query = "SELECT * FROM alarm_counts ORDER BY id DESC LIMIT 1"
        try:
            conn = self.get_connection()
            # Usar dictionary=True para obtener un dict en lugar de una tupla
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result
        except mysql.connector.Error as err:
            print(f"❌ Error al consultar últimos contadores: {err}")
            return None
        finally:
            if 'cursor' in locals(): cursor.close()
            if 'conn' in locals(): conn.close()

    def get_history_counts(self, limit=50):
        query = "SELECT * FROM alarm_counts ORDER BY id DESC LIMIT %s"
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (limit,))
            result = cursor.fetchall()
            # Devolver en orden cronológico (ascendente)
            return list(reversed(result))
        except mysql.connector.Error as err:
            print(f"❌ Error al consultar histórico: {err}")
            return []
        finally:
            if 'cursor' in locals(): cursor.close()
            if 'conn' in locals(): conn.close()

    def get_all_device_info(self):
        query = "SELECT * FROM devices_info"
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchall()
            return result
        except mysql.connector.Error as err:
            print(f"❌ Error al consultar devices_info: {err}")
            return []
        finally:
            if 'cursor' in locals(): cursor.close()
            if 'conn' in locals(): conn.close()
