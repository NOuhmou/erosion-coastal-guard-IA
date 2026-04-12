import pymysql
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import uuid
import json

app = Flask(__name__)
CORS(app)

MAX_MEASUREMENT_JUMP_METERS = 15.0

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

def log_audit(cur, table_name, record_id, action, payload):
    cur.execute(
        """
        INSERT INTO AUDIT_LOG (id_log, table_cible, id_enregistrement, action, valeur_apres)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            table_name,
            record_id,
            action,
            json.dumps(payload, ensure_ascii=False, default=str)
        )
    )

def recompute_zone_stats(cur, zone_id):
    # Include pending releves so dashboard reflects the latest field input immediately.
    cur.execute(
        """
        SELECT IFNULL(AVG(diff), 0) AS avg_recul
        FROM (
            SELECT
                rt.id_point,
                (MAX(rt.distance_trait_cote) - MIN(rt.distance_trait_cote)) /
                GREATEST(TIMESTAMPDIFF(YEAR, MIN(rt.date_mesure), MAX(rt.date_mesure)), 1) AS diff
            FROM RELEVE_TERRAIN rt
            JOIN POINT_MESURE pm ON rt.id_point = pm.id_point
            WHERE pm.id_zone = %s
              AND rt.statut_validation IN ('VALIDE', 'EN_ATTENTE')
            GROUP BY rt.id_point
        ) sub
        """,
        (zone_id,)
    )
    avg_result = cur.fetchone() or {}
    avg_recul = float(avg_result.get('avg_recul') or 0)

    cur.execute(
        """
        UPDATE ZONE_COTIERE
        SET recul_annuel_moyen = %s
        WHERE id_zone = %s
        """,
        (avg_recul, zone_id)
    )

    cur.execute(
        """
        SELECT id_zone, nom, recul_annuel_moyen, recul_projete_100ans, classification_actuelle
        FROM ZONE_COTIERE
        WHERE id_zone = %s
        """,
        (zone_id,)
    )
    return cur.fetchone()

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
            
            cur.execute("SELECT IFNULL(SUM(longueur_km), 0) as km FROM ZONE_COTIERE WHERE classification_actuelle = 'ROUGE'")
            zone_rouge_km = cur.fetchone()['km'] or 0
            
            cur.execute("SELECT COUNT(*) as count FROM POINT_MESURE WHERE actif = TRUE")
            total_points = cur.fetchone()['count'] or 0
            
            cur.execute("SELECT COUNT(*) as count FROM ZONE_COTIERE WHERE classification_actuelle IN ('ROUGE', 'NOIRE')")
            non_constructibles = cur.fetchone()['count'] or 0
            
        return jsonify({
            'recul_moyen': round(float(recul_moyen), 2),
            'zone_rouge_km': round(float(zone_rouge_km), 2),
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

# ===== HISTORIQUE REELS =====
@app.route('/api/historical-data', methods=['GET'])
def get_historical_data():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    z.id_zone,
                    z.nom AS nom_zone,
                    YEAR(rt.date_mesure) AS annee,
                    AVG(rt.distance_trait_cote) AS distance_moyenne,
                    z.classification_actuelle AS statut
                FROM RELEVE_TERRAIN rt
                JOIN POINT_MESURE pm ON rt.id_point = pm.id_point
                JOIN ZONE_COTIERE z ON pm.id_zone = z.id_zone
                WHERE rt.statut_validation = 'VALIDE'
                GROUP BY z.id_zone, z.nom, YEAR(rt.date_mesure), z.classification_actuelle
                ORDER BY z.nom ASC, annee ASC
                """
            )
            rows = cur.fetchall()

        # Calcul du recul par annee base sur la variation de distance moyenne par zone.
        previous_by_zone = {}
        result = []
        for row in rows:
            zone_id = row['id_zone']
            current_avg = float(row['distance_moyenne'] or 0)
            prev_avg = previous_by_zone.get(zone_id)
            recul = 0.0 if prev_avg is None else max(current_avg - prev_avg, 0.0)
            previous_by_zone[zone_id] = current_avg

            result.append({
                'nom_zone': row['nom_zone'],
                'annee': int(row['annee']) if row['annee'] is not None else None,
                'recul': round(recul, 3),
                'statut': row['statut']
            })

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ===== HISTORIQUE CLASSIFICATION =====
@app.route('/api/classification-history', methods=['GET'])
def get_classification_history():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        limit = request.args.get('limit', 50, type=int)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    z.nom AS zone,
                    h.classification_avant AS avant,
                    h.classification_apres AS apres,
                    h.date_changement AS date,
                    h.justification
                FROM HISTORIQUE_CLASSIFICATION h
                JOIN ZONE_COTIERE z ON h.id_zone = z.id_zone
                ORDER BY h.date_changement DESC
                LIMIT %s
                """,
                (limit,)
            )
            rows = cur.fetchall()
        return jsonify(rows)
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
                        (
                            SELECT ABS(
                                latest.distance_trait_cote - COALESCE(
                                    (
                                        SELECT prev.distance_trait_cote
                                        FROM RELEVE_TERRAIN prev
                                        WHERE prev.id_point = p.id_point
                                        ORDER BY prev.date_mesure DESC, prev.created_at DESC
                                        LIMIT 1 OFFSET 1
                                    ),
                                    latest.distance_trait_cote
                                )
                            )
                            FROM RELEVE_TERRAIN latest
                            WHERE latest.id_point = p.id_point
                            ORDER BY latest.date_mesure DESC, latest.created_at DESC
                            LIMIT 1
                        ), 
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
        data = request.get_json(silent=True) or {}
        required_fields = ['id_point', 'id_agent', 'date_mesure', 'methode_mesure']
        missing_fields = [f for f in required_fields if f not in data or data[f] in (None, '')]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        measurement_type = (data.get('measurement_type') or 'DISTANCE').upper()
        if measurement_type not in ('DISTANCE', 'RECUL'):
            return jsonify({"error": "measurement_type invalide (DISTANCE ou RECUL)"}), 400

        if measurement_type == 'DISTANCE' and data.get('distance_trait_cote') in (None, ''):
            return jsonify({"error": "distance_trait_cote est requis en mode DISTANCE"}), 400

        if measurement_type == 'RECUL' and data.get('recul_observe') in (None, ''):
            return jsonify({"error": "recul_observe est requis en mode RECUL"}), 400

        releve_id = str(uuid.uuid4())
        statut_validation = data.get('statut_validation') or 'VALIDE'
        
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id_zone
                FROM POINT_MESURE
                WHERE id_point = %s
                """,
                (data['id_point'],)
            )
            point_zone = cur.fetchone()
            if not point_zone:
                return jsonify({"error": "Point de mesure introuvable"}), 404

            zone_id = point_zone['id_zone']

            cur.execute(
                """
                SELECT distance_trait_cote
                FROM RELEVE_TERRAIN
                WHERE id_point = %s
                ORDER BY date_mesure DESC, created_at DESC
                LIMIT 1
                """,
                (data['id_point'],)
            )
            last_measure = cur.fetchone()
            previous_distance = None
            if last_measure and last_measure.get('distance_trait_cote') is not None:
                previous_distance = float(last_measure['distance_trait_cote'])

            if measurement_type == 'RECUL':
                try:
                    recul_observe = float(data['recul_observe'])
                except (TypeError, ValueError):
                    return jsonify({"error": "recul_observe doit etre un nombre"}), 400

                if recul_observe < 0:
                    return jsonify({"error": "recul_observe ne peut pas etre negatif"}), 400

                if previous_distance is None:
                    return jsonify({"error": "Aucune mesure precedente: utilisez d'abord le mode DISTANCE"}), 400

                if recul_observe > MAX_MEASUREMENT_JUMP_METERS:
                    return jsonify({"error": f"Recul incoherent (> {MAX_MEASUREMENT_JUMP_METERS:.1f} m)"}), 400

                new_distance = previous_distance + recul_observe
            else:
                try:
                    new_distance = float(data['distance_trait_cote'])
                except (TypeError, ValueError):
                    return jsonify({"error": "distance_trait_cote doit etre un nombre"}), 400

                if new_distance < 0:
                    return jsonify({"error": "distance_trait_cote ne peut pas etre negative"}), 400

                if previous_distance is not None:
                    jump = abs(new_distance - previous_distance)
                    if jump > MAX_MEASUREMENT_JUMP_METERS:
                        return jsonify({
                            "error": (
                                f"Mesure incoherente: ecart de {jump:.2f} m avec la derniere mesure "
                                f"({previous_distance:.2f} m). Verifiez l'unite saisie: "
                                "il faut renseigner la distance au trait de cote, pas le recul ponctuel."
                            )
                        }), 400
            cur.execute(
                """
                SELECT id_zone, nom, recul_annuel_moyen, recul_projete_100ans, classification_actuelle
                FROM ZONE_COTIERE
                WHERE id_zone = %s
                """,
                (zone_id,)
            )
            zone_before = cur.fetchone()

            cur.execute("""
                INSERT INTO RELEVE_TERRAIN (id_releve, id_point, id_agent, date_mesure, distance_trait_cote, methode_mesure, statut_validation)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (releve_id, data['id_point'], data['id_agent'], data['date_mesure'], new_distance, data['methode_mesure'], statut_validation))

            log_audit(cur, 'RELEVE_TERRAIN', releve_id, 'INSERT', {
                'id_releve': releve_id,
                'id_point': data['id_point'],
                'id_agent': data['id_agent'],
                'date_mesure': data['date_mesure'],
                'measurement_type': measurement_type,
                'recul_observe': data.get('recul_observe'),
                'distance_trait_cote': new_distance,
                'methode_mesure': data['methode_mesure'],
                'statut_validation': statut_validation
            })

            zone_after = recompute_zone_stats(cur, zone_id)
            log_audit(cur, 'ZONE_COTIERE', zone_id, 'UPDATE', {
                'source': 'add_releve',
                'before': zone_before,
                'after': zone_after
            })

            conn.commit()
        
        return jsonify({
            "message": "Relevé ajouté avec succès",
            "id": releve_id,
            "zone_update": zone_after
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ===== AUDIT LOGS =====
@app.route('/api/audit-logs', methods=['GET'])
def get_audit_logs():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        limit = request.args.get('limit', 50, type=int)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id_log, table_cible, id_enregistrement, action, valeur_apres, timestamp_action
                FROM AUDIT_LOG
                ORDER BY timestamp_action DESC
                LIMIT %s
                """,
                (limit,)
            )
            logs = cur.fetchall()
        return jsonify(logs)
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
                ORDER BY r.date_mesure DESC, r.created_at DESC, r.id_releve DESC
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
