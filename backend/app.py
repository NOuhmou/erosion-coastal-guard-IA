import pymysql
from flask import Flask, jsonify, request
from flask_cors import CORS  # ← IMPORTANT
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)  # ← IMPORTANT - Autorise toutes les origines

# Configuration MySQL
DB_CONFIG = {
    "host": "localhost",
    "database": "coastal_guard",
    "user": "root",
    "password": "",  # Votre mot de passe MySQL
    "port": 3306
}

def get_db_connection():
    try:
        conn = pymysql.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            port=DB_CONFIG["port"],
            cursorclass=pymysql.cursors.DictCursor
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

@app.route('/api/status', methods=['GET'])
def get_status():
    conn = get_db_connection()
    db_status = "Connected" if conn else "Disconnected"
    if conn: conn.close()
    return jsonify({
        "system": "Coastal Guard IA",
        "database": db_status,
        "version": "1.2.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/kpi', methods=['GET'])
def get_kpi():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT AVG(recul_annuel_moyen) as avg FROM ZONE_COTIERE")
            result = cur.fetchone()
            recul_moyen = result['avg'] if result['avg'] else 0
            
            cur.execute("SELECT COUNT(*) as count FROM ZONE_COTIERE WHERE classification_actuelle = 'ROUGE'")
            zones_rouges = cur.fetchone()['count'] or 0
            
            cur.execute("SELECT COUNT(*) as count FROM POINT_MESURE WHERE actif = TRUE")
            total_points = cur.fetchone()['count'] or 0
            
            cur.execute("SELECT COUNT(*) as count FROM ZONE_COTIERE WHERE classification_actuelle IN ('ROUGE', 'NOIRE')")
            non_constructibles = cur.fetchone()['count'] or 0
            
        return jsonify({
            'recul_moyen': round(float(recul_moyen), 2),
            'zone_rouge_km': round(float(zones_rouges) * 1.2, 1),
            'points_gps': total_points,
            'zones_non_constructibles': non_constructibles
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/graphiques', methods=['GET'])
def get_graphiques():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT nom, recul_annuel_moyen FROM ZONE_COTIERE")
            zones = cur.fetchall()
            
        labels = [z['nom'] for z in zones]
        data_recul = [float(z['recul_annuel_moyen']) for z in zones]
        
        return jsonify({
            'type': 'bar',
            'labels': labels,
            'datasets': [
                {
                    'label': 'Recul Actuel (m)',
                    'data': data_recul,
                    'backgroundColor': '#2b6c8f'
                }
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/zones-risque', methods=['GET'])
def get_zones_risque():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    z.nom as nom_zone,
                    AVG(p.latitude) as latitude,
                    AVG(p.longitude) as longitude,
                    z.recul_annuel_moyen as recul_max,
                    z.classification_actuelle as statut,
                    CASE 
                        WHEN z.classification_actuelle = 'ROUGE' THEN 'totale'
                        WHEN z.classification_actuelle = 'ORANGE' THEN 'restreinte'
                        ELSE 'aucune'
                    END as interdiction
                FROM ZONE_COTIERE z
                LEFT JOIN POINT_MESURE p ON z.id_zone = p.id_zone
                GROUP BY z.id_zone, z.nom, z.recul_annuel_moyen, z.classification_actuelle
            """)
            zones = cur.fetchall()
        
        for z in zones:
            z['latitude'] = float(z['latitude']) if z['latitude'] else 30.45
            z['longitude'] = float(z['longitude']) if z['longitude'] else -9.65
            z['recul_max'] = float(z['recul_max']) if z['recul_max'] else 0
            
        return jsonify(zones)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/points-carte', methods=['GET'])
def get_points_carte():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    p.id_point,
                    p.code_point as nom_point,
                    p.latitude,
                    p.longitude,
                    z.nom as nom_zone,
                    COALESCE(
                        (SELECT distance_trait_cote FROM RELEVE_TERRAIN 
                         WHERE id_point = p.id_point ORDER BY date_mesure DESC LIMIT 1), 
                        0
                    ) as dernier_recul
                FROM POINT_MESURE p
                JOIN ZONE_COTIERE z ON p.id_zone = z.id_zone
                WHERE p.actif = TRUE
            """)
            points = cur.fetchall()
            
        for p in points:
            p['latitude'] = float(p['latitude'])
            p['longitude'] = float(p['longitude'])
            p['dernier_recul'] = float(p['dernier_recul']) if p['dernier_recul'] else 0
            
        return jsonify(points)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
