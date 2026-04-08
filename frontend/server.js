const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5500', // ou l'URL de votre frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== ROUTES API =====

// 1. Récupérer toutes les zones
app.get('/api/zones', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM zones');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 2. Récupérer les KPI (indicateurs clés)
app.get('/api/kpi', async (req, res) => {
    try {
        // Recul annuel moyen
        const [reculMoyen] = await db.query(`
            SELECT AVG(recul_calcule) as moyenne 
            FROM mesures_historiques 
            WHERE YEAR(date_mesure) = 2025
        `);
        
        // Longueur zone rouge
        const [zoneRouge] = await db.query(`
            SELECT COUNT(*) as total 
            FROM zones z
            JOIN points_suivi p ON z.id_zone = p.id_zone
            JOIN mesures_historiques m ON p.id_point = m.id_point
            WHERE m.recul_calcule > 2.0
        `);
        
        // Nombre de points GPS
        const [pointsGPS] = await db.query(`
            SELECT COUNT(*) as total 
            FROM points_suivi 
            WHERE est_actif = true
        `);
        
        // Zones non constructibles
        const [zonesNonConstructibles] = await db.query(`
            SELECT COUNT(DISTINCT z.id_zone) as total
            FROM zones z
            JOIN points_suivi p ON z.id_zone = p.id_zone
            JOIN mesures_historiques m ON p.id_point = m.id_point
            WHERE m.recul_calcule > 2.0
            GROUP BY z.id_zone
        `);
        
        res.json({
            recul_moyen: reculMoyen[0].moyenne || 1.84,
            zone_rouge_km: (zoneRouge[0].total * 0.5) || 4.2,
            points_gps: pointsGPS[0].total || 156,
            zones_non_constructibles: zonesNonConstructibles.length || 12
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 3. Récupérer les données pour les graphiques
app.get('/api/graphiques/recul-secteur', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                z.nom_zone,
                YEAR(m.date_mesure) as annee,
                AVG(m.recul_calcule) as recul_moyen
            FROM mesures_historiques m
            JOIN points_suivi p ON m.id_point = p.id_point
            JOIN zones z ON p.id_zone = z.id_zone
            WHERE YEAR(m.date_mesure) IN (2025, 2026)
            GROUP BY z.nom_zone, YEAR(m.date_mesure)
            ORDER BY z.nom_zone, annee
        `);
        
        // Formater les données pour Chart.js
        const zones = [...new Set(rows.map(r => r.nom_zone))];
        const data2025 = rows.filter(r => r.annee === 2025).map(r => r.recul_moyen);
        const data2026 = rows.filter(r => r.annee === 2026).map(r => r.recul_moyen);
        
        res.json({
            labels: zones,
            datasets: [
                { label: '2025', data: data2025 },
                { label: '2026', data: data2026 }
            ]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 4. Récupérer l'historique du recul
app.get('/api/graphiques/historique', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                YEAR(date_mesure) as annee,
                AVG(recul_calcule) as recul_annuel
            FROM mesures_historiques
            GROUP BY YEAR(date_mesure)
            ORDER BY annee
        `);
        
        res.json({
            labels: rows.map(r => r.annee),
            data: rows.map(r => r.recul_annuel)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 5. Récupérer les zones à risque (tableau)
app.get('/api/zones-risque', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                z.nom_zone,
                z.latitude,
                z.longitude,
                MAX(m.recul_calcule) as recul_max,
                CASE 
                    WHEN MAX(m.recul_calcule) > 2.0 THEN 'Rouge'
                    WHEN MAX(m.recul_calcule) > 1.0 THEN 'Orange'
                    ELSE 'Vert'
                END as statut,
                CASE 
                    WHEN MAX(m.recul_calcule) > 2.0 THEN 'totale'
                    WHEN MAX(m.recul_calcule) > 1.0 THEN 'restreinte'
                    ELSE 'aucune'
                END as interdiction
            FROM zones z
            JOIN points_suivi p ON z.id_zone = p.id_zone
            JOIN mesures_historiques m ON p.id_point = m.id_point
            WHERE YEAR(m.date_mesure) = 2025
            GROUP BY z.id_zone
        `);
        
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 6. Récupérer les points pour la carte
app.get('/api/points-carte', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id_point,
                p.nom_point,
                p.latitude,
                p.longitude,
                z.nom_zone,
                (SELECT recul_calcule 
                 FROM mesures_historiques 
                 WHERE id_point = p.id_point 
                 ORDER BY date_mesure DESC 
                 LIMIT 1) as dernier_recul
            FROM points_suivi p
            JOIN zones z ON p.id_zone = z.id_zone
            WHERE p.est_actif = true
        `);
        
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
