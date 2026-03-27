import os
import psycopg2
from psycopg2 import extras
from flask import Flask, jsonify, request
from datetime import datetime

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "coastal_guard"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASS", "postgres"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        app.logger.error(f"Database connection error: {e}")
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

# --- Business Logic: Erosion Calculation ---

@app.route('/api/admin/recalculate/<uuid:zone_id>', methods=['POST'])
def recalculate_zone(zone_id):
    """
    Expert-only endpoint to trigger the stored procedure for erosion calculation.
    Responsabilité: Connexion DB-Système & Logique métier.
    """
    user_role = request.headers.get('X-User-Role')
    if user_role not in ['EXPERT', 'ADMIN']:
        return jsonify({"error": "Unauthorized. Only Experts or Admins can trigger recalculation."}), 403

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500

    try:
        with conn.cursor() as cur:
            # Call the stored procedure for R1/R2
            cur.execute("CALL calculate_erosion_stats(%s)", (str(zone_id),))
            conn.commit()
            
            # Fetch updated data (Triggers trg_risk_update and trg_history_log have run)
            cur.execute("""
                SELECT nom, classification_actuelle, recul_annuel_moyen, recul_projete_100ans 
                FROM ZONE_COTIERE WHERE id_zone = %s
            """, (str(zone_id),))
            row = cur.fetchone()
            
        return jsonify({
            "status": "Success",
            "zone": row[0],
            "classification": row[1],
            "average_erosion_m_year": float(row[2]),
            "projected_100y_m": float(row[3])
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- Business Logic: Relevé Submission ---

@app.route('/api/releves', methods=['POST'])
def add_releve():
    """
    Agent endpoint to submit new GPS measurements.
    """
    data = request.json
    required = ['id_point', 'distance_trait_cote', 'id_agent']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields: id_point, distance_trait_cote, id_agent"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500

    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO RELEVE_TERRAIN 
                   (id_point, distance_trait_cote, id_agent, methode_mesure, coefficient_maree, conditions_meteo) 
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_releve""",
                (data['id_point'], data['distance_trait_cote'], data['id_agent'], 
                 data.get('methode_mesure', 'GPS_DGPS'), data.get('coefficient_maree'), data.get('conditions_meteo'))
            )
            releve_id = cur.fetchone()[0]
            conn.commit()
        return jsonify({"status": "Created", "id_releve": releve_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- Business Logic: Permit Requests ---

@app.route('/api/permits', methods=['POST'])
def request_permit():
    """
    Submit a permit request. The database trigger 'trg_permit_validation' 
    implements Rules R10/R11 automatically.
    """
    data = request.json
    required = ['id_demandeur', 'id_zone', 'id_parcelle', 'nom_projet', 'distance_trait_cote_m']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required project data"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500

    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO DEMANDE_PERMIS 
                   (id_demandeur, id_zone, id_parcelle, nom_projet, distance_trait_cote_m) 
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (data['id_demandeur'], data['id_zone'], data['id_parcelle'], 
                 data['nom_projet'], data['distance_trait_cote_m'])
            )
            new_permit = cur.fetchone()
            conn.commit()
        
        return jsonify({
            "status": "Processed",
            "id_demande": new_permit['id_demande'],
            "decision": new_permit['statut'],
            "motif": new_permit['motif_blocage'] if new_permit['statut'] == 'REFUSE' else "En attente de revue"
        }), 201 if new_permit['statut'] != 'REFUSE' else 403
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- Audit & History ---

@app.route('/api/zones/<uuid:zone_id>/history', methods=['GET'])
def get_zone_history(zone_id):
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM HISTORIQUE_CLASSIFICATION WHERE id_zone = %s ORDER BY date_changement DESC", (str(zone_id),))
            history = cur.fetchall()
        return jsonify(history)
    finally:
        conn.close()

# --- Frontend Compatibility Endpoints ---

@app.route('/api/kpi', methods=['GET'])
def get_kpi():
    """
    Returns KPIs as expected by frontend script.js
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            # Recul moyen 2026
            cur.execute("SELECT AVG(recul_annuel_moyen) as avg FROM ZONE_COTIERE")
            recul_moyen = cur.fetchone()['avg'] or 0
            
            # Nb zones rouges
            cur.execute("SELECT COUNT(*) as count FROM ZONE_COTIERE WHERE classification_actuelle = 'ROUGE'")
            zones_rouges = cur.fetchone()['count'] or 0
            
            # Total points
            cur.execute("SELECT COUNT(*) as count FROM POINT_MESURE WHERE actif = TRUE")
            total_points = cur.fetchone()['count'] or 0
            
            # Zones non constructibles (Rouge + Orange as example)
            cur.execute("SELECT COUNT(*) as count FROM ZONE_COTIERE WHERE classification_actuelle IN ('ROUGE', 'NOIRE')")
            non_constructibles = cur.fetchone()['count'] or 0
            
        return jsonify({
            'recul_moyen': round(float(recul_moyen), 2),
            'zone_rouge_km': round(float(zones_rouges) * 1.2, 1), # Simplified calculation
            'points_gps': total_points,
            'zones_non_constructibles': non_constructibles
        })
    finally:
        conn.close()

@app.route('/api/graphiques', methods=['GET'])
def get_graphiques():
    """
    Returns data formatted for Chart.js as expected by script.js
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
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
    finally:
        conn.close()

@app.route('/api/zones-risque', methods=['GET'])
def get_zones_risque():
    """
    Returns zones for the risk table
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    nom as nom_zone,
                    latitude,
                    longitude,
                    recul_annuel_moyen as recul_max,
                    classification_actuelle as statut,
                    CASE 
                        WHEN classification_actuelle = 'ROUGE' THEN 'totale'
                        WHEN classification_actuelle = 'ORANGE' THEN 'restreinte'
                        ELSE 'aucune'
                    END as interdiction
                FROM ZONE_COTIERE z
                JOIN (SELECT id_zone, AVG(latitude) as latitude, AVG(longitude) as longitude 
                      FROM POINT_MESURE GROUP BY id_zone) p ON z.id_zone = p.id_zone
            """)
            zones = cur.fetchall()
        
        # Convert Decimals to float for JSON
        for z in zones:
            z['latitude'] = float(z['latitude'])
            z['longitude'] = float(z['longitude'])
            z['recul_max'] = float(z['recul_max'])
            
        return jsonify(zones)
    finally:
        conn.close()

@app.route('/api/points-carte', methods=['GET'])
def get_points_carte():
    """
    Returns points for Leaflet map
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    p.id_point,
                    p.code_point as nom_point,
                    p.latitude,
                    p.longitude,
                    z.nom as nom_zone,
                    COALESCE((SELECT distance_trait_cote FROM RELEVE_TERRAIN 
                     WHERE id_point = p.id_point ORDER BY date_mesure DESC LIMIT 1), 0) as dernier_recul
                FROM POINT_MESURE p
                JOIN ZONE_COTIERE z ON p.id_zone = z.id_zone
                WHERE p.actif = TRUE
            """)
            points = cur.fetchall()
            
        for p in points:
            p['latitude'] = float(p['latitude'])
            p['longitude'] = float(p['longitude'])
            p['dernier_recul'] = float(p['dernier_recul'])
            
        return jsonify(points)
    finally:
        conn.close()

if __name__ == '__main__':
    # Responsabilité: Implémentation de la logique métier & Connexion
    app.run(debug=True, host='0.0.0.0', port=5000)
