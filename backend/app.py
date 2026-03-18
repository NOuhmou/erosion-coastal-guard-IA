
from flask import Flask, jsonify
import psycopg2 

app = Flask(__name__)

# 1. Database Connection Logic
def get_db_connection():
   
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="coastal_guard",
            user="postgres",
            password="your_password"
        )
        return conn
    except:
        return None


@app.route('/api/zones', methods=['GET'])
def get_zones():
    
    zones = [
        {"id": 1, "nom": "Agadir Sector A", "status": "ORANGE", "recul": "1.5m/an"},
        {"id": 2, "nom": "Taghazout North", "status": "VERTE", "recul": "0.3m/an"}
    ]
    return jsonify(zones)


@app.route('/api/admin/recalc', methods=['POST'])
def trigger_recalculation():
    
    return jsonify({"message": "Recalculation started by Admin role"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
