// ===== script.js COMPLET POUR TON HTML =====

// Configuration - Backend Flask
const API_BASE_URL = "http://localhost:5000/api";

// ===== VARIABLES GLOBALES =====
let barChart, lineChart, historyFullChart, compareChart, timeChart;

// ===== INITIALISATION =====
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 Démarrage de l'application...");

  await testConnection();
  initMap();

  await Promise.all([
    fetchKPI(),
    fetchGraphiques(),
    fetchZonesRisque(),
    fetchHistoricalData(),
    fetchAuditHistory(),
  ]);

  initNavigation();
  loadDataEntryOptions();

  console.log("✅ Application prête!");
});

// ===== TEST CONNEXION =====
async function testConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);
    const data = await response.json();
    console.log("✅ Backend connecté:", data);
    return true;
  } catch (error) {
    console.error("❌ Backend non accessible:", error);
    return false;
  }
}

// ===== CARTE PRINCIPALE =====
function initMap() {
  console.log("🗺️ Initialisation de la carte...");
  const mapElement = document.getElementById("coastMap");
  if (!mapElement) return;

  try {
    const map = L.map("coastMap").setView([30.45, -9.65], 11);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(map);
    window.coastMap = map;
    fetchPointsCarte();
  } catch (error) {
    console.error("Erreur carte:", error);
  }
}

// ===== CARTE PLEIN ÉCRAN (PAGE LITTORAL) =====
function initFullMap() {
  const mapElement = document.getElementById("fullscreenMap");
  if (!mapElement) return;

  const map = L.map("fullscreenMap").setView([30.45, -9.65], 11);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap",
    },
  ).addTo(map);
  window.fullMap = map;

  fetch(`${API_BASE_URL}/points-carte`)
    .then((r) => r.json())
    .then((points) => {
      points.forEach((point) => {
        let color = "#2b6c8f";
        if (point.dernier_recul > 2.0) color = "#d62728";
        else if (point.dernier_recul > 1.0) color = "#ffaa33";

        L.circleMarker([point.latitude, point.longitude], {
          radius: 8,
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
        })
          .addTo(map)
          .bindPopup(
            `<b>${point.nom_point}</b><br>Zone: ${point.nom_zone}<br>Recul: ${point.dernier_recul.toFixed(2)}m`,
          );
      });
      if (points.length > 0) {
        map.fitBounds(
          L.latLngBounds(points.map((p) => [p.latitude, p.longitude])),
        );
      }
    })
    .catch((e) => console.error("Erreur:", e));
}

// ===== MISE À JOUR DES POINTS SUR LA CARTE =====
function updateMapPoints(points) {
  const map = window.coastMap;
  if (!map) return;

  map.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  if (!points || points.length === 0) return;

  points.forEach((point) => {
    try {
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      let reculValue = point.dernier_recul
        ? parseFloat(point.dernier_recul)
        : 0;
      if (isNaN(reculValue)) reculValue = 0;

      let color = "#2b6c8f";
      if (reculValue > 2.0) color = "#d62728";
      else if (reculValue > 1.0) color = "#ffaa33";

      L.circleMarker([lat, lng], {
        radius: 8,
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(map).bindPopup(`
                <b>${point.nom_point || "Point"}</b><br>
                Zone: ${point.nom_zone || "Inconnue"}<br>
                Recul: ${reculValue.toFixed(2)} m
            `);
    } catch (error) {
      console.error("Erreur:", error);
    }
  });
}

// ===== CHARGEMENT DES DONNÉES API =====
async function fetchKPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/kpi`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateKPI(data);
  } catch (error) {
    console.error("Erreur KPI:", error);
    updateKPI({
      recul_moyen: 1.84,
      zone_rouge_km: 4.2,
      points_gps: 6,
      zones_non_constructibles: 4,
    });
  }
}

async function fetchGraphiques() {
  try {
    const response = await fetch(`${API_BASE_URL}/graphiques`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateBarChart(data);
    updateLineChart({
      labels: ["2016", "2018", "2020", "2022", "2024", "2026"],
      data: [0, 0.9, 2.1, 3.5, 5.3, 7.4],
    });
  } catch (error) {
    console.error("Erreur graphiques:", error);
    updateBarChart({
      labels: ["Agadir", "Taghazout", "Anza", "Cap Ghir", "Oued Souss"],
      datasets: [
        {
          label: "Recul Actuel",
          data: [2.1, 1.6, 1.9, 0.7, 2.8],
          backgroundColor: "#2b6c8f",
        },
      ],
    });
    updateLineChart({
      labels: ["2016", "2018", "2020", "2022", "2024", "2026"],
      data: [0, 0.9, 2.1, 3.5, 5.3, 7.4],
    });
  }
}

async function fetchZonesRisque() {
  try {
    const response = await fetch(`${API_BASE_URL}/zones-risque`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const zones = await response.json();
    updateRiskTable(zones);
    updateRiskTableFull(zones);
  } catch (error) {
    console.error("Erreur zones:", error);
  }
}

async function fetchHistoricalData() {
  try {
    const response = await fetch(`${API_BASE_URL}/historical-data`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    updateHistoricalTable(rows);
  } catch (error) {
    console.error("Erreur historique:", error);
    updateHistoricalTable([]);
  }
}

async function fetchAuditHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/classification-history?limit=50`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    updateAuditTable(rows);
  } catch (error) {
    console.error("Erreur audit:", error);
    updateAuditTable([]);
  }
}

async function fetchPointsCarte() {
  try {
    const response = await fetch(`${API_BASE_URL}/points-carte`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const points = await response.json();
    updateMapPoints(points);
  } catch (error) {
    console.error("Erreur points carte:", error);
  }
}

// ===== MISE À JOUR DES AFFICHAGES =====
function updateKPI(data) {
  const kpiValues = document.querySelectorAll("#page-dashboard .kpi-value");
  if (kpiValues.length >= 4) {
    kpiValues[0].innerHTML = `${data.recul_moyen} <span class="kpi-unit">m/an</span>`;
    kpiValues[1].innerHTML = `${data.zone_rouge_km} <span class="kpi-unit">km</span>`;
    kpiValues[2].innerHTML = data.points_gps;
    kpiValues[3].innerHTML = data.zones_non_constructibles;
  }
}

function updateBarChart(data) {
  const ctx = document.getElementById("erosionSectorChart");
  if (!ctx) return;
  if (window.barChart) window.barChart.destroy();
  window.barChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Mètres" } },
      },
    },
  });
}

function updateLineChart(data) {
  const ctx = document.getElementById("historyLineChart");
  if (!ctx) return;
  if (window.lineChart) window.lineChart.destroy();
  let cumul = 0;
  const cumulData = data.data.map((val) => {
    cumul += val;
    return parseFloat(cumul.toFixed(2));
  });
  window.lineChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Recul cumulé (m)",
          data: cumulData,
          borderColor: "#b85b1a",
          backgroundColor: "rgba(230,138,46,0.05)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: "top" } } },
  });
}

function updateRiskTable(zones) {
  const tbody = document.getElementById("riskTableBody");
  if (!tbody) return;

  if (!zones || zones.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Aucune zone trouvée</td></tr>';
    return;
  }

  tbody.innerHTML = zones
    .map((zone) => {
      const nomZone = zone.nom_zone || zone.nom || "Sans nom";
      const latitude = zone.latitude
        ? parseFloat(zone.latitude).toFixed(3)
        : "0.000";
      const longitude = zone.longitude
        ? parseFloat(zone.longitude).toFixed(3)
        : "0.000";
      const recul = zone.recul_max
        ? parseFloat(zone.recul_max).toFixed(1)
        : "0.0";
      const statut = zone.statut || "VERTE";
      const statutClass = statut.toLowerCase();

      let interdictionIcon = "aucune";
      if (statut === "ROUGE")
        interdictionIcon =
          '<i class="fas fa-ban" style="color:#b91c1c;"></i> totale';
      else if (statut === "ORANGE") interdictionIcon = "restreinte";
      else interdictionIcon = "aucune";

      return `<tr><td>${nomZone}</td><td>${latitude}, ${longitude}</td><td>${recul} m</td><td><span class="zone-tag ${statutClass}">${statut}</span></td><td>${interdictionIcon}</td></tr>`;
    })
    .join("");
}

function updateRiskTableFull(zones) {
  const tbody = document.querySelector("#risk-table-full tbody");
  if (!tbody) return;

  if (!zones || zones.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Aucune zone trouvée</td></tr>';
    return;
  }

  tbody.innerHTML = zones
    .map((zone) => {
      let constructibilite = "✅ Autorisée";
      if (zone.statut === "ROUGE") constructibilite = "❌ Interdite";
      else if (zone.statut === "ORANGE") constructibilite = "⚠️ Restreinte";

      return `<tr>
            <td>${zone.nom_zone || zone.nom || "Sans nom"}</td>
            <td>${zone.latitude ? parseFloat(zone.latitude).toFixed(3) : "0.000"}, ${zone.longitude ? parseFloat(zone.longitude).toFixed(3) : "0.000"}</td>
            <td>${zone.recul_max ? parseFloat(zone.recul_max).toFixed(2) : "0.00"} m</td>
            <td><span class="zone-tag ${(zone.statut || "VERTE").toLowerCase()}">${zone.statut || "VERTE"}</span></td>
            <td>${constructibilite}</td>
        </tr>`;
    })
    .join("");
}

function updateHistoricalTable(rows) {
  const tbody = document.querySelector("#historical-table tbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Aucune donnée historique</td></tr>';
    const ctx = document.getElementById("historyChartFull");
    if (ctx && window.historyFullChart) {
      window.historyFullChart.destroy();
      window.historyFullChart = null;
    }
    return;
  }

  tbody.innerHTML = rows
    .slice(0, 20)
    .map(
      (h) => `
        <tr>
            <td>${h.nom_zone || "Sans nom"}</td>
            <td>${h.annee ?? "-"}</td>
            <td>${parseFloat(h.recul || 0).toFixed(2)} m</td>
            <td><span class="zone-tag ${(h.statut || "VERTE").toLowerCase()}">${h.statut || "VERTE"}</span></td>
        </tr>
    `,
    )
    .join("");

  const byYear = {};
  rows.forEach((h) => {
    const year = String(h.annee ?? "-");
    byYear[year] = (byYear[year] || 0) + parseFloat(h.recul || 0);
  });

  const labels = Object.keys(byYear).sort((a, b) => Number(a) - Number(b));
  let cumul = 0;
  const cumulData = labels.map((y) => {
    cumul += byYear[y];
    return Number(cumul.toFixed(2));
  });

  // Graphique historique base sur donnees reelles
  const ctx = document.getElementById("historyChartFull");
  if (ctx) {
    if (window.historyFullChart) window.historyFullChart.destroy();
    window.historyFullChart = new Chart(ctx.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Recul cumulé (m)",
            data: cumulData,
            borderColor: "#b85b1a",
            backgroundColor: "rgba(230,138,46,0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: { responsive: true },
    });
  }
}

function updateAuditTable(rows) {
  const tbody = document.querySelector("#audit-table tbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Aucun historique d\'audit</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (log) => `
        <tr>
            <td>${log.zone || "-"}</td>
            <td><span class="zone-tag ${String(log.avant || "VERTE").toLowerCase()}">${log.avant || "-"}</span></td>
            <td><span class="zone-tag ${String(log.apres || "VERTE").toLowerCase()}">${log.apres || "-"}</span></td>
            <td>${log.date ? new Date(log.date).toLocaleDateString() : "-"}</td>
            <td>${log.justification || "Mise à jour automatique"}</td>
        </tr>
    `,
    )
    .join("");
}

// ===== NAVIGATION ENTRE PAGES =====
function initNavigation() {
  console.log("🔄 Initialisation de la navigation...");

  const navItems = document.querySelectorAll(".nav-item");
  const allPages = document.querySelectorAll(".page-content");

  function showPage(pageId) {
    console.log(`📄 Affichage de la page: ${pageId}`);

    allPages.forEach((page) => {
      page.classList.remove("active");
      page.style.display = "none";
    });

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add("active");
      targetPage.style.display = "block";
    }

    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.page === pageId) {
        item.classList.add("active");
      }
    });

    // Charger les données spécifiques
    if (pageId === "littoral") {
      setTimeout(() => {
        initFullMap();
      }, 100);
    } else if (pageId === "dataentry") {
      loadDataEntryOptions();
    }
  }

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      if (pageId) showPage(pageId);
    });
  });

  // Page par défaut
  showPage("dashboard");
}

// ===== PAGE SAISIE TERRAIN =====
async function loadDataEntryOptions() {
  try {
    const pointsRes = await fetch(`${API_BASE_URL}/points-carte`);
    const points = await pointsRes.json();

    const pointSelect = document.getElementById("id_point");
    if (pointSelect) {
      pointSelect.innerHTML =
        '<option value="">-- Sélectionner un point GPS --</option>' +
        points
          .map(
            (p) =>
              `<option value="${p.id_point}">📍 ${p.nom_point} - ${p.nom_zone}</option>`,
          )
          .join("");
    }

    const agentsRes = await fetch(`${API_BASE_URL}/agents`);
    const agents = await agentsRes.json();

    const agentSelect = document.getElementById("id_agent");
    if (agentSelect) {
      agentSelect.innerHTML =
        '<option value="">-- Sélectionner l\'agent --</option>' +
        agents
          .map(
            (a) =>
              `<option value="${a.id_utilisateur}">👤 ${a.prenom} ${a.nom}</option>`,
          )
          .join("");
    }

    loadLastReleves();
  } catch (error) {
    console.error("Erreur chargement options:", error);
  }
}

function initMeasurementModeUI() {
  const typeSelect = document.getElementById("measurement_type");
  const distanceLabel =
    document.querySelector('label[for="distance"]') ||
    document.querySelector("#distance")?.parentElement?.querySelector("label");
  const distanceHelp = document.getElementById("distance_help");
  const globalHelp = document.getElementById("measurement_help");

  if (!typeSelect || !distanceLabel || !distanceHelp || !globalHelp) return;

  const applyMode = () => {
    const mode = typeSelect.value;
    if (mode === "RECUL") {
      distanceLabel.innerHTML =
        '<i class="fas fa-ruler"></i> Recul observé (mètres) *';
      distanceHelp.textContent =
        "Saisir le recul observé depuis la dernière mesure (ex: 0.3 m).";
      globalHelp.textContent =
        "Mode recul: la nouvelle distance sera calculée automatiquement.";
    } else {
      distanceLabel.innerHTML =
        '<i class="fas fa-ruler"></i> Distance au trait de côte (mètres) *';
      distanceHelp.textContent =
        "Distance mesurée depuis le point fixe jusqu'au bord de mer.";
      globalHelp.textContent =
        "Mode distance: saisir la distance totale mesurée depuis le point fixe.";
    }
  };

  typeSelect.addEventListener("change", applyMode);
  applyMode();
}

const releveForm = document.getElementById("releveForm");
if (releveForm) {
  initMeasurementModeUI();

  releveForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const measurementType =
      document.getElementById("measurement_type")?.value || "DISTANCE";
    const valueInput = parseFloat(document.getElementById("distance").value);

    const data = {
      id_point: document.getElementById("id_point").value,
      methode_mesure: document.getElementById("methode").value,
      id_agent: document.getElementById("id_agent").value,
      date_mesure: new Date().toISOString(),
      statut_validation: "VALIDE",
      measurement_type: measurementType,
    };

    if (measurementType === "RECUL") {
      data.recul_observe = valueInput;
    } else {
      data.distance_trait_cote = valueInput;
    }

    const messageBox = document.getElementById("messageBox");

    if (!data.id_point || Number.isNaN(valueInput) || !data.id_agent) {
      messageBox.style.display = "block";
      messageBox.style.background = "#fee2e2";
      messageBox.style.color = "#b91c1c";
      messageBox.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> ❌ Veuillez remplir tous les champs obligatoires.';
      setTimeout(() => {
        messageBox.style.display = "none";
      }, 3000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/releves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        messageBox.style.display = "block";
        messageBox.style.background = "#dcfce7";
        messageBox.style.color = "#166534";
        messageBox.innerHTML =
          '<i class="fas fa-check-circle"></i> ✅ Relevé enregistré avec succès !';
        document.getElementById("releveForm").reset();

        await Promise.all([
          loadLastReleves(),
          fetchKPI(),
          fetchZonesRisque(),
          fetchHistoricalData(),
          fetchAuditHistory(),
          fetchPointsCarte(),
          fetchGraphiques(),
        ]);

        setTimeout(() => {
          messageBox.style.display = "none";
        }, 2000);
      } else {
        let backendMessage = "Erreur lors de l'enregistrement";
        try {
          const errData = await response.json();
          if (errData && errData.error) backendMessage = errData.error;
        } catch (parseError) {
          console.error("Erreur lecture message backend:", parseError);
        }
        throw new Error(backendMessage);
      }
    } catch (error) {
      messageBox.style.display = "block";
      messageBox.style.background = "#fee2e2";
      messageBox.style.color = "#b91c1c";
      messageBox.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> ❌ Erreur : ' +
        error.message;
      setTimeout(() => {
        messageBox.style.display = "none";
      }, 3000);
    }
  });
}

async function loadLastReleves() {
  try {
    const response = await fetch(`${API_BASE_URL}/releves?limit=5`);
    const releves = await response.json();

    const tbody = document.querySelector("#lastRelevesTable tbody");
    if (tbody && releves && releves.length > 0) {
      tbody.innerHTML = releves
        .map(
          (r) => `
                <tr>
                    <td style="padding: 12px 8px;">📍 ${r.point_name || r.id_point?.substring(0, 8)}</td>
                    <td style="padding: 12px 8px; font-weight: 600;">${r.distance_trait_cote} m</td>
                    <td style="padding: 12px 8px;">${new Date(r.date_mesure).toLocaleDateString()}</td>
                    <td style="padding: 12px 8px;"><span class="zone-tag ${r.statut_validation === "VALIDE" ? "green" : "orange"}">${r.statut_validation}</span></td>
                </tr>
            `,
        )
        .join("");
    } else if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;">Aucun relevé enregistré</td></tr>';
    }
  } catch (error) {
    console.error("Erreur chargement relevés:", error);
  }
}
