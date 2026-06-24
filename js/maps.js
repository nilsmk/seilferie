// Map initialization and drawing functions

let map = null;
let mapMarkers = [];
let mapPolyline = null;

let dbMap = null;
let dbMapMarkers = [];
let dbDragMarker = null;

let summaryMap = null;
let summaryMapMarkers = [];
let summaryMapPolyline = null;

function initializeMap() {
    try {
        if (map) return;
        map = L.map('sailing-map', { center: [59.2, 10.7], zoom: 9, zoomControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
    } catch (e) { console.error("Map init failed", e); }
}

function initializeDatabaseMap() {
    try {
        if (dbMap) return;
        dbMap = L.map('db-map', { center: [59.2, 10.7], zoom: 8, zoomControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(dbMap);
        dbMap.on('click', function(e) {
            const editId = document.getElementById("edit-harbor-id").value;
            if (!editId) {
                document.getElementById("form-harbor-lat").value = e.latlng.lat.toFixed(4);
                document.getElementById("form-harbor-lng").value = e.latlng.lng.toFixed(4);
                showToast("Koordinater kopiert til skjemaet!", "info");
            }
        });
    } catch (e) { console.error("Database Map init failed", e); }
}

function initializeSummaryMap() {
    try {
        if (summaryMap) return;
        summaryMap = L.map('summary-map', { center: [59.2, 10.7], zoom: 9, zoomControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(summaryMap);
    } catch (e) { console.error("Summary map init failed", e); }
}

function drawMapRoute() {
    try {
        if (!map || typeof L === 'undefined') return;
        mapMarkers.forEach(m => m.remove()); mapMarkers = [];
        if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }

        const pathCoords = [];
        state.routeDays.forEach((day, index) => {
            const harbor = state.harbors.find(h => h.id === day.harborId);
            if (harbor) {
                pathCoords.push([harbor.lat, harbor.lng]);
                const markerColor = day.booked ? "#10b981" : "#0ea5e9";
                const markerWeight = day.booked ? 3 : 2;
                const markerRadius = day.booked ? 10 : 8;

                const marker = L.circleMarker([harbor.lat, harbor.lng], {
                    radius: markerRadius, fillColor: markerColor, color: "#ffffff", weight: markerWeight, fillOpacity: 0.9
                }).addTo(map);

                const lockBadge = day.booked ? `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 w-max mt-1"><i class="fa-solid fa-lock text-[8px]"></i> BESTILT HAVN</span>` : '';
                marker.bindPopup(`<div class="p-1"><h4 class="font-bold text-sm text-white">${harbor.name}</h4><p class="text-xs text-sky-200 mt-0.5">Dag ${index + 1} i ruteplanen</p>${lockBadge}</div>`);
                mapMarkers.push(marker);
            }
        });

        if (pathCoords.length > 1) {
            mapPolyline = L.polyline(pathCoords, { color: '#14b8a6', weight: 4, opacity: 0.8, dashArray: '8, 6' }).addTo(map);
            map.fitBounds(mapPolyline.getBounds(), { padding: [30, 30] });
        } else if (pathCoords.length === 1) map.setView(pathCoords[0], 10);
    } catch (e) { console.error("Error drawing map route", e); }
}

function drawDatabaseMapRoutes() {
    try {
        if (!dbMap || typeof L === 'undefined') return;
        dbMapMarkers.forEach(m => m.remove()); dbMapMarkers = [];
        if (dbDragMarker) { dbDragMarker.remove(); dbDragMarker = null; }

        const editId = document.getElementById("edit-harbor-id").value;

        state.harbors.forEach(h => {
            const isUnderEdit = h.id === editId;
            const isPlanned = state.routeDays.some(d => d.harborId === h.id);

            if (isUnderEdit) {
                const yellowAnchorIcon = L.divIcon({ html: `<div class="w-10 h-10 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center border-2 border-white shadow-2xl animate-bounce cursor-pointer"><i class="fa-solid fa-anchor text-sm"></i></div>`, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
                dbDragMarker = L.marker([h.lat, h.lng], { icon: yellowAnchorIcon, draggable: true }).addTo(dbMap);
                dbDragMarker.bindTooltip(`<div class="bg-slate-950 text-white border-none p-1 text-[11px] font-bold rounded">Dra meg for å flytte "${h.name}"!</div>`, { permanent: true, direction: "top" });
                dbDragMarker.on('drag', function(e) {
                    const position = dbDragMarker.getLatLng();
                    document.getElementById("form-harbor-lat").value = position.lat.toFixed(4);
                    document.getElementById("form-harbor-lng").value = position.lng.toFixed(4);
                });
                dbDragMarker.on('dragend', function(e) { showToast("Havnen har fått nye koordinater. Husk å klikke 'Lagre endringer'!", "info"); });
            } else {
                const color = isPlanned ? "#10b981" : "#475569";
                const marker = L.circleMarker([h.lat, h.lng], { radius: 7, fillColor: color, color: "#ffffff", weight: 1.5, fillOpacity: 0.8 }).addTo(dbMap);
                marker.bindPopup(`<div class="p-1"><h4 class="font-bold text-sm text-white">${h.name}</h4><p class="text-[10px] text-slate-300 mt-1">${isPlanned ? '🟢 Ligger i årets rute' : '⚪ Ikke i rute'}</p><button onclick="editHarbor('${h.id}')" class="mt-2 w-full px-2 py-1 bg-amber-500 text-slate-950 rounded text-[10px] font-bold"><i class="fa-solid fa-pen"></i> Rediger / Flytt</button></div>`);
                dbMapMarkers.push(marker);
            }
        });

        if (editId) {
            const h = state.harbors.find(har => har.id === editId);
            if (h) dbMap.setView([h.lat, h.lng], 10);
        }
    } catch (e) { console.error("Error drawing database map", e); }
}

function drawSummaryMapRoute() {
    try {
        if (!summaryMap || typeof L === 'undefined') return;
        summaryMapMarkers.forEach(m => m.remove()); summaryMapMarkers = [];
        if (summaryMapPolyline) { summaryMapPolyline.remove(); summaryMapPolyline = null; }

        const pathCoords = [];
        state.routeDays.forEach((day, index) => {
            const harbor = state.harbors.find(h => h.id === day.harborId);
            if (harbor) {
                pathCoords.push([harbor.lat, harbor.lng]);
                const markerColor = day.booked ? "#10b981" : "#0ea5e9";
                const markerWeight = day.booked ? 3 : 2;
                const markerRadius = day.booked ? 10 : 8;

                const marker = L.circleMarker([harbor.lat, harbor.lng], {
                    radius: markerRadius, fillColor: markerColor, color: "#ffffff", weight: markerWeight, fillOpacity: 0.9
                }).addTo(summaryMap);

                marker.bindPopup(`<div class="p-1 text-slate-900"><h4 class="font-bold text-sm">${harbor.name}</h4><p class="text-xs text-slate-600">Dag ${index + 1} i ruteplanen</p></div>`);
                summaryMapMarkers.push(marker);
            }
        });

        if (pathCoords.length > 1) {
            summaryMapPolyline = L.polyline(pathCoords, { color: '#14b8a6', weight: 4, opacity: 0.8, dashArray: '8, 6' }).addTo(summaryMap);
            summaryMap.fitBounds(summaryMapPolyline.getBounds(), { padding: [30, 30] });
        } else if (pathCoords.length === 1) summaryMap.setView(pathCoords[0], 10);
    } catch (e) { console.error("Error drawing summary map", e); }
}
