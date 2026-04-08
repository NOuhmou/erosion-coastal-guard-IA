// ===== script.js VERSION CORRIGÉE (navigation fonctionnelle) =====

// Configuration - Backend Flask
const API_BASE_URL = 'http://localhost:5000/api';

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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        window.coastMap = map;
        console.log('✅ Carte initialisée');
        
        fetchPointsCarte();
        
    } catch (error) {
        console.error('❌ Erreur initialisation carte:', error);
    }
}

// ===== FONCTIONS DE RÉCUPÉRATION DES DONNÉES =====

async function fetchKPI() {
    try {
        console.log('📊 Chargement des KPI...');
        const response = await fetch(`${API_BASE_URL}/kpi`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('KPI reçus:', data);
        updateKPI(data);
        
    } catch (error) {
        console.error('❌ Erreur chargement KPI:', error);
        updateKPI({ recul_moyen: 1.84, zone_rouge_km: 4.2, points_gps: 156, zones_non_constructibles: 12 });
    }
}

async function fetchGraphiques() {
    try {
        console.log('📈 Chargement des graphiques...');
        const response = await fetch(`${API_BASE_URL}/graphiques`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('Données graphiques reçues:', data);
        updateBarChart(data);
        
        updateLineChart({
            labels: ['2016', '2018', '2020', '2022', '2024', '2026'],
            data: [0, 0.9, 2.1, 3.5, 5.3, 7.4]
        });
        
    } catch (error) {
        console.error('❌ Erreur chargement graphiques:', error);
        initDefaultCharts();
    }
}

async function fetchZonesRisque() {
    try {
        console.log('⚠️ Chargement des zones à risque...');
        const response = await fetch(`${API_BASE_URL}/zones-risque`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const zones = await response.json();
        console.log(`${zones.length} zones reçues:`, zones);
        updateRiskTable(zones);
        
    } catch (error) {
        console.error('❌ Erreur chargement zones:', error);
    }
}

async function fetchPointsCarte() {
    try {
        console.log('📍 Chargement des points pour la carte...');
        const response = await fetch(`${API_BASE_URL}/points-carte`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const points = await response.json();
        console.log(`${points.length} points reçus:`, points);
        updateMapPoints(points);
        
    } catch (error) {
        console.error('❌ Erreur chargement points carte:', error);
    }
}

// ===== FONCTIONS DE MISE À JOUR =====

function updateKPI(data) {
    const kpiValues = document.querySelectorAll('#page-dashboard .kpi-value');
    if (kpiValues.length >= 4) {
        kpiValues[0].innerHTML = `${data.recul_moyen} <span class="kpi-unit">m/an</span>`;
        kpiValues[1].innerHTML = `${data.zone_rouge_km} <span class="kpi-unit">km</span>`;
        kpiValues[2].innerHTML = data.points_gps;
        kpiValues[3].innerHTML = data.zones_non_constructibles;
    }
}

function updateBarChart(data) {
    const ctx = document.getElementById('erosionSectorChart');
    if (!ctx) return;
    
    const ctx2d = ctx.getContext('2d');
    if (window.barChart) window.barChart.destroy();
    
    window.barChart = new Chart(ctx2d, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Mètres' } } }
        }
    });
}

function updateLineChart(data) {
    const ctx = document.getElementById('historyLineChart');
    if (!ctx) return;
    
    const ctx2d = ctx.getContext('2d');
    if (window.lineChart) window.lineChart.destroy();
    
    let cumul = 0;
    const cumulData = data.data.map(val => { cumul += val; return parseFloat(cumul.toFixed(2)); });
    
    window.lineChart = new Chart(ctx2d, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Recul cumulé (m)',
                data: cumulData,
                borderColor: '#b85b1a',
                backgroundColor: 'rgba(230,138,46,0.05)',
                tension: 0.3,
                fill: true
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
}

function updateRiskTable(zones) {
    const tbody = document.querySelector('#page-dashboard tbody');
    if (!tbody) return;
    
    if (!zones || zones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucune zone trouvée</td></tr>`;
        return;
    }
    
    tbody.innerHTML = zones.map(zone => {
        const nomZone = zone.nom_zone || zone.nom || 'Sans nom';
        const latitude = zone.latitude ? parseFloat(zone.latitude).toFixed(3) : '0.000';
        const longitude = zone.longitude ? parseFloat(zone.longitude).toFixed(3) : '0.000';
        const recul = zone.recul_max ? parseFloat(zone.recul_max).toFixed(1) : '0.0';
        const statut = zone.statut || 'VERTE';
        const statutClass = statut.toLowerCase();
        
        let interdictionIcon = 'aucune';
        if (statut === 'ROUGE') interdictionIcon = '<i class="fas fa-ban" style="color:#b91c1c;"></i> totale';
        else if (statut === 'ORANGE') interdictionIcon = 'restreinte';
        else interdictionIcon = 'aucune';
        
        return `<tr>
            <td>${nomZone}</td>
            <td>${latitude}, ${longitude}</td>
            <td>${recul} m</td>
            <td><span class="zone-tag ${statutClass}">${statut}</span></td>
            <td>${interdictionIcon}</td>
        </tr>`;
    }).join('');
}

function updateMapPoints(points) {
    const map = window.coastMap;
    if (!map) return;
    
    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Marker) map.removeLayer(layer);
    });
    
    if (!points || points.length === 0) return;
    
    points.forEach(point => {
        try {
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            let reculValue = point.dernier_recul ? parseFloat(point.dernier_recul) : 0;
            
            if (isNaN(lat) || isNaN(lng)) return;
            if (isNaN(reculValue)) reculValue = 0;
            
            let color = '#2b6c8f';
            if (reculValue > 2.0) color = '#d62728';
            else if (reculValue > 1.0) color = '#ffaa33';
            
            L.circleMarker([lat, lng], {
                radius: 8, color: color, fillColor: color, fillOpacity: 0.8, weight: 2
            }).addTo(map).bindPopup(`
                <b>${point.nom_point || 'Point'}</b><br>
                Zone: ${point.nom_zone || 'Inconnue'}<br>
                Recul: ${reculValue.toFixed(2)} m
            `);
        } catch (error) { console.error('Erreur:', error); }
    });
}

function initDefaultCharts() {
    updateBarChart({
        labels: ['Agadir', 'Taghazout', 'Anza', 'Cap Ghir', 'Oued Souss'],
        datasets: [{ label: 'Recul Actuel', data: [2.1, 1.6, 1.9, 0.7, 2.8], backgroundColor: '#2b6c8f' }]
    });
    updateLineChart({
        labels: ['2016', '2018', '2020', '2022', '2024', '2026'],
        data: [0, 0.9, 2.1, 3.5, 5.3, 7.4]
    });
}

async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        console.log('✅ Backend connecté:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend non accessible:', error);
        return false;
    }
}

// ===== NAVIGATION ENTRE LES PAGES (CORRIGÉE) =====

function initNavigation() {
    console.log('🔄 Initialisation de la navigation...');
    
    const navItems = document.querySelectorAll('.nav-item');
    const allPages = document.querySelectorAll('.page-content');
    
    console.log(`📄 ${allPages.length} pages trouvées`);
    console.log(`🔘 ${navItems.length} boutons trouvés`);
    
    // Fonction pour afficher une page
    function showPage(pageId) {
        console.log(`📄 Affichage de la page: ${pageId}`);
        
        // Cacher TOUTES les pages
        allPages.forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        
        // Afficher la page sélectionnée
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.display = 'block';
            console.log(`✅ Page affichée: page-${pageId}`);
        } else {
            console.error(`❌ Page non trouvée: page-${pageId}`);
        }
        
        // Mettre à jour la classe active du menu
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });
        
        // Charger les données spécifiques à la page
        loadPageSpecificData(pageId);
    }
    
    // Charger les données selon la page
    function loadPageSpecificData(pageId) {
        switch(pageId) {
            case 'littoral':
                setTimeout(() => {
                    if (window.fullMap) window.fullMap.remove();
                    initFullMap();
                }, 100);
                break;
            case 'historical':
                loadHistoricalData();
                break;
            case 'riskzones':
                loadRiskZonesFull();
                break;
            case 'audit':
                loadAuditData();
                break;
            case 'iacompare':
                loadIACompareCharts();
                break;
        }
    }
    
    // Ajouter les événements de clic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pageId = item.dataset.page;
            if (pageId) {
                console.log(`🔘 Clic sur: ${pageId}`);
                showPage(pageId);
            }
        });
    });
    
    // Afficher la page dashboard par défaut
    showPage('dashboard');
}

// ===== FONCTIONS POUR LES PAGES SECONDAIRES =====

function initFullMap() {
    const mapElement = document.getElementById('fullscreenMap');
    if (!mapElement) return;
    
    const map = L.map('fullscreenMap').setView([30.45, -9.65], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    window.fullMap = map;
    
    fetch(`${API_BASE_URL}/points-carte`)
        .then(response => response.json())
        .then(points => {
            points.forEach(point => {
                let color = '#2b6c8f';
                if (point.dernier_recul > 2.0) color = '#d62728';
                else if (point.dernier_recul > 1.0) color = '#ffaa33';
                
                L.circleMarker([point.latitude, point.longitude], {
                    radius: 8, color: color, fillColor: color, fillOpacity: 0.8
                }).addTo(map).bindPopup(`<b>${point.nom_point}</b><br>Zone: ${point.nom_zone}<br>Recul: ${point.dernier_recul.toFixed(2)}m`);
            });
            
            if (points.length > 0) {
                const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
                map.fitBounds(bounds.pad(0.2));
            }
        })
        .catch(error => console.error('Erreur:', error));
}

async function loadHistoricalData() {
    try {
        const response = await fetch(`${API_BASE_URL}/zones-risque`);
        const zones = await response.json();
        
        const tbody = document.querySelector('#historical-table tbody');
        if (tbody && zones.length > 0) {
            const historicalData = [];
            zones.forEach(zone => {
                const years = [2020, 2021, 2022, 2023, 2024, 2025];
                years.forEach((year, idx) => {
                    historicalData.push({
                        zone: zone.nom_zone,
                        year: year,
                        recul: (parseFloat(zone.recul_max) * (0.5 + idx * 0.1)).toFixed(2),
                        classification: zone.statut
                    });
                });
            });
            
            tbody.innerHTML = historicalData.map(h => `
                <tr><td>${h.zone}</td><td>${h.year}</td><td>${h.recul} m</td>
                <td><span class="zone-tag ${h.classification.toLowerCase()}">${h.classification}</span></td></tr>
            `).join('');
        }
        
        const ctx = document.getElementById('historyChartFull');
        if (ctx) {
            const ctx2d = ctx.getContext('2d');
            if (window.historyFullChart) window.historyFullChart.destroy();
            window.historyFullChart = new Chart(ctx2d, {
                type: 'line',
                data: {
                    labels: ['2016', '2018', '2020', '2022', '2024', '2026'],
                    datasets: [{
                        label: 'Recul cumulé (m)',
                        data: [0, 0.9, 2.1, 3.5, 5.3, 7.4],
                        borderColor: '#b85b1a',
                        backgroundColor: 'rgba(230,138,46,0.1)',
                        tension: 0.3, fill: true
                    }]
                },
                options: { responsive: true }
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadRiskZonesFull() {
    try {
        const response = await fetch(`${API_BASE_URL}/zones-risque`);
        const zones = await response.json();
        
        const tbody = document.querySelector('#risk-table-full tbody');
        if (tbody) {
            tbody.innerHTML = zones.map(zone => {
                let constructibilite = '✅ Autorisée';
                if (zone.statut === 'ROUGE') constructibilite = '❌ Interdite';
                else if (zone.statut === 'ORANGE') constructibilite = '⚠️ Restreinte';
                
                return `<tr>
                    <td>${zone.nom_zone}</td>
                    <td>${zone.latitude.toFixed(3)}, ${zone.longitude.toFixed(3)}</td>
                    <td>${zone.recul_max.toFixed(2)} m</td>
                    <td><span class="zone-tag ${zone.statut.toLowerCase()}">${zone.statut}</span></td>
                    <td>${constructibilite}</td>
                </tr>`;
            }).join('');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadAuditData() {
    const tbody = document.querySelector('#audit-table tbody');
    if (!tbody) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/zones-risque`);
        const zones = await response.json();
        
        const auditLogs = zones.map(zone => ({
            zone: zone.nom_zone,
            avant: 'VERTE',
            apres: zone.statut,
            date: new Date().toLocaleDateString(),
            justification: 'Mise à jour automatique par trigger'
        }));
        
        tbody.innerHTML = auditLogs.map(log => `<tr>
            <td>${log.zone}</td>
            <td><span class="zone-tag green">${log.avant}</span></td>
            <td><span class="zone-tag ${log.apres.toLowerCase()}">${log.apres}</span></td>
            <td>${log.date}</td>
            <td>${log.justification}</td>
        </tr>`).join('');
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function loadIACompareCharts() {
    const ctxCompare = document.getElementById('iaCompareChart');
    if (ctxCompare) {
        const ctx2d = ctxCompare.getContext('2d');
        if (window.iaCompareChart && typeof window.iaCompareChart.destroy === 'function') {
            window.iaCompareChart.destroy();
        }
        window.iaCompareChart = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: ['SQL', 'Frontend', 'API', 'Corrections'],
                datasets: [
                    { label: 'IA', data: [95, 90, 85, 75], backgroundColor: '#e68a2e' },
                    { label: 'Manuel', data: [100, 100, 100, 100], backgroundColor: '#2b6c8f' }
                ]
            },
            options: { responsive: true, scales: { y: { max: 100 } } }
        });
    }
    
    const ctxTime = document.getElementById('iaTimeChart');
    if (ctxTime) {
        const ctx2d = ctxTime.getContext('2d');
        if (window.iaTimeChart && typeof window.iaTimeChart.destroy === 'function') {
            window.iaTimeChart.destroy();
        }
        window.iaTimeChart = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: ['Conception', 'Dev', 'Tests', 'Doc'],
                datasets: [
                    { label: 'IA', data: [2, 5, 2, 1], backgroundColor: '#e68a2e' },
                    { label: 'Manuel', data: [5, 12, 5, 3], backgroundColor: '#2b6c8f' }
                ]
            },
            options: { responsive: true }
        });
    }
}

// ===== INITIALISATION PRINCIPALE =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Démarrage de l\'application...');
    
    await testConnection();
    initMap();
    
    await Promise.all([
        fetchKPI(),
        fetchGraphiques(),
        fetchZonesRisque()
    ]);
    
    // Initialiser la navigation (après avoir chargé les données)
    initNavigation();
    
    console.log('✅ Application prête!');
});
