// ===== script.js MODIFIÉ POUR UTILISER LA BASE DE DONNÉES =====

const API_URL = 'api.php?action=';

// ===== INITIALISATION DE LA CARTE =====
function initMap() {
    console.log('🗺️ Initialisation de la carte...');
    
    const mapElement = document.getElementById('coastMap');
    if (!mapElement) {
        console.error('❌ Élément #coastMap non trouvé');
        return;
    }
    
    try {
        const map = L.map('coastMap').setView([30.45, -9.65], 11);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        window.coastMap = map;
        console.log('✅ Carte initialisée');
        
        // Charger les points depuis la base
        fetchPointsCarte();
        
    } catch (error) {
        console.error('❌ Erreur initialisation carte:', error);
    }
}

// ===== FONCTIONS DE RÉCUPÉRATION DES DONNÉES =====

async function fetchKPI() {
    try {
        console.log('📊 Chargement des KPI...');
        const response = await fetch(API_URL + 'kpi');
        const data = await response.json();
        
        console.log('KPI reçus:', data);
        updateKPI(data);
        
    } catch (error) {
        console.error('❌ Erreur chargement KPI:', error);
        showError('Impossible de charger les indicateurs');
    }
}

async function fetchGraphiques() {
    try {
        console.log('📈 Chargement des graphiques...');
        
        // Charger les données des graphiques
        const barResponse = await fetch(API_URL + 'graphiques');
        const barData = await barResponse.json();
        
        const histResponse = await fetch(API_URL + 'historique');
        const histData = await histResponse.json();
        
        console.log('Données graphiques reçues');
        
        updateBarChart(barData);
        updateLineChart(histData);
        
    } catch (error) {
        console.error('❌ Erreur chargement graphiques:', error);
        showError('Impossible de charger les graphiques');
        initDefaultCharts(); // Utiliser données par défaut en cas d'erreur
    }
}

async function fetchZonesRisque() {
    try {
        console.log('⚠️ Chargement des zones à risque...');
        const response = await fetch(API_URL + 'zones-risque');
        const zones = await response.json();
        
        console.log(`${zones.length} zones reçues`);
        updateRiskTable(zones);
        
    } catch (error) {
        console.error('❌ Erreur chargement zones:', error);
        showError('Impossible de charger les zones à risque');
    }
}

async function fetchPointsCarte() {
    try {
        console.log('📍 Chargement des points pour la carte...');
        const response = await fetch(API_URL + 'points-carte');
        const points = await response.json();
        
        console.log(`${points.length} points reçus`);
        updateMapPoints(points);
        
    } catch (error) {
        console.error('❌ Erreur chargement points carte:', error);
        showError('Impossible de charger les points de la carte');
    }
}

// ===== FONCTIONS DE MISE À JOUR =====

function updateKPI(data) {
    const kpiValues = document.querySelectorAll('.kpi-value');
    if (kpiValues.length >= 4) {
        kpiValues[0].innerHTML = `${data.recul_moyen} <span class="kpi-unit">m/an</span>`;
        kpiValues[1].innerHTML = `${data.zone_rouge_km} <span class="kpi-unit">km</span>`;
        kpiValues[2].innerHTML = data.points_gps;
        kpiValues[3].innerHTML = data.zones_non_constructibles;
    }
}

function updateBarChart(data) {
    const ctx = document.getElementById('erosionSectorChart').getContext('2d');
    
    if (window.barChart) window.barChart.destroy();
    
    window.barChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Mètres' }
                }
            }
        }
    });
}

function updateLineChart(data) {
    const ctx = document.getElementById('historyLineChart').getContext('2d');
    
    if (window.lineChart) window.lineChart.destroy();
    
    // Calculer le cumul
    let cumul = 0;
    const cumulData = data.data.map(val => {
        cumul += val;
        return parseFloat(cumul.toFixed(2));
    });
    
    window.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Recul cumulé (m)',
                data: cumulData,
                borderColor: '#b85b1a',
                backgroundColor: 'rgba(230,138,46,0.05)',
                tension: 0.2,
                fill: true,
                pointBackgroundColor: '#12455f',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Mètres cumulés' }
                }
            }
        }
    });
}

function updateRiskTable(zones) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = zones.map(zone => {
        const statutClass = zone.statut.toLowerCase();
        const interdictionIcon = zone.interdiction === 'totale' ? 
            '<i class="fas fa-ban" style="color:#b91c1c;"></i> totale' : 
            zone.interdiction;
        
        return `
            <tr>
                <td>${zone.nom_zone}</td>
                <td>${parseFloat(zone.latitude).toFixed(3)}, ${parseFloat(zone.longitude).toFixed(3)}</td>
                <td>${zone.recul_max} m</td>
                <td><span class="zone-tag ${statutClass}">${zone.statut}</span></td>
                <td>${interdictionIcon}</td>
            </tr>
        `;
    }).join('');
}

// ===== VERSION AVEC DEBUG =====
function updateMapPoints(points) {
    const map = window.coastMap;
    if (!map) {
        console.error('❌ Carte non initialisée');
        return;
    }
    
    console.log('📍 Mise à jour de la carte avec', points.length, 'points');
    console.log('Premier point exemple:', points[0]); // Voir la structure des données
    
    // Effacer les anciens marqueurs
    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });
    
    points.forEach((point, index) => {
        try {
            // Vérifier chaque champ
            if (!point.latitude || !point.longitude) {
                console.warn(`⚠️ Point ${index} sans coordonnées:`, point);
                return;
            }
            
            // Convertir les coordonnées en nombres
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Point ${index} coordonnées invalides:`, point);
                return;
            }
            
            // Gérer dernier_recul
            let reculValue = 0;
            if (point.dernier_recul === null || point.dernier_recul === undefined) {
                console.log(`ℹ️ Point ${point.nom_point}: pas de valeur de recul`);
            } else {
                reculValue = parseFloat(point.dernier_recul);
                if (isNaN(reculValue)) {
                    console.warn(`⚠️ Point ${point.nom_point}: recul non numérique:`, point.dernier_recul);
                    reculValue = 0;
                }
            }
            
            // Déterminer la couleur
            let color = '#0066b3';
            let status = 'normal';
            if (reculValue > 2.0) {
                color = '#d62728';
                status = 'critique';
            } else if (reculValue > 1.0) {
                color = '#ffaa33';
                status = 'surveillance';
            }
            
            // Créer le marqueur
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2
            }).addTo(map);
            
            // Ajouter la popup
            marker.bindPopup(`
                <b>${point.nom_point || 'Point ' + index}</b><br>
                Zone: ${point.nom_zone || 'Inconnue'}<br>
                Statut: <span style="color:${color};">${status}</span><br>
                Recul: ${reculValue.toFixed(2)} m<br>
                Coord: ${lat.toFixed(4)}, ${lng.toFixed(4)}
            `);
            
        } catch (error) {
            console.error(`❌ Erreur sur le point ${index}:`, error, point);
        }
    });
    
    // Ajuster la vue pour voir tous les points
    if (points.length > 0) {
        try {
            const bounds = L.latLngBounds(
                points
                    .filter(p => p.latitude && p.longitude)
                    .map(p => [parseFloat(p.latitude), parseFloat(p.longitude)])
            );
            if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.2));
            }
        } catch (error) {
            console.error('❌ Erreur ajustement vue:', error);
        }
    }
    
    console.log('✅ Mise à jour de la carte terminée');
}

function showError(message) {
    const main = document.querySelector('.main');
    if (!main || document.querySelector('.error-banner')) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.style.cssText = `
        background: #fee2e2;
        color: #b91c1c;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        text-align: center;
        border-left: 4px solid #b91c1c;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    main.prepend(errorDiv);
    
    // Faire disparaître après 5 secondes
    setTimeout(() => errorDiv.remove(), 5000);
}

function initDefaultCharts() {
    // Données par défaut si la base est vide
    updateBarChart({
        labels: ['Agadir', 'Taghazout', 'Anza', 'Cap Ghir', 'Oued Souss'],
        datasets: [
            { label: '2025', data: [2.1, 1.6, 1.9, 0.7, 2.8], backgroundColor: '#2b6c8f' },
            { label: '2026', data: [2.4, 1.9, 2.2, 0.8, 3.3], backgroundColor: '#e68a2e' }
        ]
    });
    
    updateLineChart({
        labels: ['2016', '2018', '2020', '2022', '2024', '2026'],
        data: [0, 0.9, 2.1, 3.5, 5.3, 7.4]
    });
}

async function testConnection() {
    try {
        const response = await fetch(API_URL + 'test');
        const data = await response.json();
        console.log('🔌 Test connexion:', data);
        
        if (data.success) {
            console.log('✅ Connexion à la base OK');
        } else {
            console.error('❌ Problème de connexion:', data.error);
            showError('Problème de connexion à la base de données');
        }
    } catch (error) {
        console.error('❌ Impossible de contacter l\'API:', error);
        showError('API non accessible. Vérifiez que api.php est présent');
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Démarrage de l\'application...');
    
    // Tester la connexion d'abord
    await testConnection();
    
    // Initialiser la carte
    initMap();
    
    // Charger toutes les données
    await Promise.all([
        fetchKPI(),
        fetchGraphiques(),
        fetchZonesRisque()
    ]);
    
    console.log('✅ Application prête!');
});
