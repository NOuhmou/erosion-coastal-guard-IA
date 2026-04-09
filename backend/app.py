import pymysql
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Configuration MySQL
DB_CONFIG = {
    "host": "localhost",
    "database": "coastal_guard",
    "user": "root",
    "password": "",  # Mets ton mot de passe MySQL ici
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

# ===== STATUS =====
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

# ===== KPI =====
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

# ===== GRAPHIQUES =====
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

# ===== ZONES RISQUE =====
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

# ===== POINTS CARTE =====
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

# ===== AGENTS =====
@app.route('/api/agents', methods=['GET'])
def get_agents():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id_utilisateur, nom, prenom, role 
                FROM UTILISATEUR 
                WHERE role IN ('AGENT', 'ADMIN') AND actif = TRUE
            """)
            agents = cur.fetchall()
        return jsonify(agents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ===== AJOUTER RELEVE =====
@app.route('/api/releves', methods=['POST'])
def add_releve():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        data = request.get_json()
        releve_id = str(uuid.uuid4())
        
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO RELEVE_TERRAIN (id_releve, id_point, id_agent, date_mesure, distance_trait_cote, methode_mesure, statut_validation)
                VALUES (%s, %s, %s, %s, %s, %s, 'EN_ATTENTE')
            """, (releve_id, data['id_point'], data['id_agent'], data['date_mesure'], data['distance_trait_cote'], data['methode_mesure']))
            conn.commit()
            
            # Recalculer les statistiques de la zone
            cur.execute("SELECT id_zone FROM POINT_MESURE WHERE id_point = %s", (data['id_point'],))
            zone = cur.fetchone()
            if zone:
                cur.execute(f"CALL calculate_erosion_stats('{zone['id_zone']}')")
                conn.commit()
        
        return jsonify({"message": "Relevé ajouté avec succès", "id": releve_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ===== LISTE RELEVES =====
@app.route('/api/releves', methods=['GET'])
def get_releves():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        limit = request.args.get('limit', 10, type=int)
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    r.id_releve,
                    r.id_point,
                    p.code_point as point_name,
                    r.distance_trait_cote,
                    r.date_mesure,
                    r.statut_validation,
                    r.methode_mesure,
                    u.prenom,
                    u.nom
                FROM RELEVE_TERRAIN r
                JOIN POINT_MESURE p ON r.id_point = p.id_point
                LEFT JOIN UTILISATEUR u ON r.id_agent = u.id_utilisateur
                ORDER BY r.date_mesure DESC
                LIMIT %s
            """, (limit,))
            releves = cur.fetchall()
        
        return jsonify(releves)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ===== LANCEMENT DU SERVEUR =====
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
