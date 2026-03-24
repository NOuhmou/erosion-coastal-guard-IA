<?php
// api.php - API pour communiquer avec MySQL
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Connexion à MySQL (MODIFIEZ CES INFORMATIONS)
$host = 'localhost';
$user = 'root';           // Votre utilisateur MySQL
$password = '';           // Votre mot de passe MySQL (souvent vide sur XAMPP)
$database = 'erosion_coastal_guard';

$connection = new mysqli($host, $user, $password, $database);

// Vérifier la connexion
if ($connection->connect_error) {
    die(json_encode([
        'success' => false,
        'error' => 'Connexion échouée: ' . $connection->connect_error
    ]));
}

// Récupérer l'action demandée
$action = $_GET['action'] ?? '';

switch($action) {
    
    // ===== 1. RÉCUPÉRER LES KPI =====
    case 'kpi':
        // Recul annuel moyen
        $result = $connection->query("
            SELECT AVG(recul_calcule) as recul_moyen 
            FROM mesures_historiques 
            WHERE YEAR(date_mesure) = 2025
        ");
        $recul = $result->fetch_assoc();
        
        // Longueur zone rouge (estimation)
        $result = $connection->query("
            SELECT COUNT(DISTINCT p.id_zone) as nb_zones_rouges
            FROM mesures_historiques m
            JOIN points_suivi p ON m.id_point = p.id_point
            WHERE m.recul_calcule > 2.0
        ");
        $zones_rouges = $result->fetch_assoc();
        
        // Points de suivi GPS
        $result = $connection->query("
            SELECT COUNT(*) as total 
            FROM points_suivi 
            WHERE est_actif = 1
        ");
        $points = $result->fetch_assoc();
        
        // Zones non constructibles
        $result = $connection->query("
            SELECT COUNT(DISTINCT p.id_zone) as total
            FROM mesures_historiques m
            JOIN points_suivi p ON m.id_point = p.id_point
            WHERE m.recul_calcule > 2.0
        ");
        $non_constructibles = $result->fetch_assoc();
        
        echo json_encode([
            'recul_moyen' => round($recul['recul_moyen'] ?? 1.84, 2),
            'zone_rouge_km' => round(($zones_rouges['nb_zones_rouges'] ?? 4) * 1.2, 1),
            'points_gps' => $points['total'] ?? 156,
            'zones_non_constructibles' => $non_constructibles['total'] ?? 12
        ]);
        break;
    
    // ===== 2. RÉCUPÉRER LES DONNÉES DES GRAPHIQUES =====
    case 'graphiques':
        // Graphique à barres - Recul par secteur
        $result = $connection->query("
            SELECT 
                z.nom_zone,
                YEAR(m.date_mesure) as annee,
                AVG(m.recul_calcule) as recul
            FROM mesures_historiques m
            JOIN points_suivi p ON m.id_point = p.id_point
            JOIN zones z ON p.id_zone = z.id_zone
            WHERE YEAR(m.date_mesure) IN (2025, 2026)
            GROUP BY z.nom_zone, YEAR(m.date_mesure)
            ORDER BY z.nom_zone, annee
        ");
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        // Formater pour Chart.js
        $zones = [];
        $data2025 = [];
        $data2026 = [];
        
        foreach ($data as $row) {
            if (!in_array($row['nom_zone'], $zones)) {
                $zones[] = $row['nom_zone'];
            }
            if ($row['annee'] == 2025) {
                $data2025[] = round($row['recul'], 2);
            } else if ($row['annee'] == 2026) {
                $data2026[] = round($row['recul'], 2);
            }
        }
        
        echo json_encode([
            'type' => 'bar',
            'labels' => $zones,
            'datasets' => [
                [
                    'label' => 'Recul 2025 (m)',
                    'data' => $data2025,
                    'backgroundColor' => '#2b6c8f'
                ],
                [
                    'label' => 'Recul 2026 (m)',
                    'data' => $data2026,
                    'backgroundColor' => '#e68a2e'
                ]
            ]
        ]);
        break;
    
    // ===== 3. RÉCUPÉRER L'HISTORIQUE =====
    case 'historique':
        $result = $connection->query("
            SELECT 
                YEAR(date_mesure) as annee,
                AVG(recul_calcule) as recul_annuel
            FROM mesures_historiques
            GROUP BY YEAR(date_mesure)
            ORDER BY annee
        ");
        
        $annees = [];
        $reculs = [];
        
        while ($row = $result->fetch_assoc()) {
            $annees[] = $row['annee'];
            $reculs[] = round($row['recul_annuel'], 2);
        }
        
        echo json_encode([
            'labels' => $annees,
            'data' => $reculs
        ]);
        break;
    
    // ===== 4. RÉCUPÉRER LES ZONES À RISQUE =====
    case 'zones-risque':
        $result = $connection->query("
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
            LEFT JOIN points_suivi p ON z.id_zone = p.id_zone
            LEFT JOIN mesures_historiques m ON p.id_point = m.id_point
            WHERE m.recul_calcule IS NOT NULL
            GROUP BY z.id_zone
        ");
        
        $zones = [];
        while ($row = $result->fetch_assoc()) {
            $zones[] = $row;
        }
        
        echo json_encode($zones);
        break;
    
    // ===== 5. RÉCUPÉRER LES POINTS POUR LA CARTE =====
    // ===== DANS api.php, case 'points-carte': =====
case 'points-carte':
    $result = $connection->query("
        SELECT 
            p.id_point,
            p.nom_point,
            p.latitude,
            p.longitude,
            z.nom_zone,
            CAST(
                (SELECT recul_calcule 
                 FROM mesures_historiques 
                 WHERE id_point = p.id_point 
                 ORDER BY date_mesure DESC 
                 LIMIT 1) AS DECIMAL(10,2)
            ) as dernier_recul
        FROM points_suivi p
        JOIN zones z ON p.id_zone = z.id_zone
        WHERE p.est_actif = 1
    ");
    
    $points = [];
    while ($row = $result->fetch_assoc()) {
        // S'assurer que dernier_recul est un nombre
        $row['dernier_recul'] = $row['dernier_recul'] !== null 
            ? floatval($row['dernier_recul']) 
            : 0;
        $points[] = $row;
    }
    
    echo json_encode($points);
    break;
    
    // ===== 6. TEST DE CONNEXION =====
    case 'test':
        echo json_encode([
            'success' => true,
            'message' => 'Connexion à la base de données réussie',
            'tables' => $connection->query("SHOW TABLES")->fetch_all()
        ]);
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'error' => 'Action non valide. Actions disponibles: kpi, graphiques, historique, zones-risque, points-carte, test'
        ]);
}

$connection->close();
?>
