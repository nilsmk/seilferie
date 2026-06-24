// Global state management and persistence
const SEED_HARBORS = [
    { id: "saetre", name: "Sætre", lat: 59.6806, lng: 10.5186, guideName: "Sætre Havn", guideUrl: "https://harbourguide.com/no/search?q=Sætre", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-2746404/Norge/Viken/Asker/S%C3%A6tre" },
    { id: "horten", name: "Horten", lat: 59.4128, lng: 10.4900, guideName: "Sykehusbrygga", guideUrl: "https://harbourguide.com/no/search?q=Sykehusbrygga", webcamUrl: "https://nettkamera.cid.no/hortenIndreHavn/max.jpg", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-2826417/Norge/Vestfold/Horten/Horten" },
    { id: "aasgaardstrand", name: "Åsgårdstrand", lat: 59.3491, lng: 10.4705, guideName: "Åsgårdstrand seilforening", guideUrl: "https://harbourguide.com/no/search?q=Åsgårdstrand", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-2825313/Norge/Vestfold/Horten/%C3%85sg%C3%A5rdstrand" },
    { id: "bolaerne", name: "Bolærne", lat: 59.2140, lng: 10.5510, guideName: "Østre Bolærne", guideUrl: "https://harbourguide.com/no/search?q=Østre Bolærne", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-3221422/Norge/Vestfold/F%C3%A6rder/Bol%C3%A6rne" },
    { id: "kungsvik", name: "Kungsvik", lat: 59.0064, lng: 11.1278, guideName: "Kungsviks Hamnförening", guideUrl: "https://harbourguide.com/no/search?q=Kungsvik", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2698124/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Str%C3%B6mstads%20Kommun/Kungsvik" },
    { id: "kyrkosund", name: "Kyrkosund (Syd-Koster)", lat: 58.8872, lng: 11.0119, guideName: "Kyrkosund", guideUrl: "https://harbourguide.com/no/search?q=Kyrkosund", webcamUrl: "https://assets1.webcam.io/w/z2kY3M/latest_hd.jpg", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2698084/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Str%C3%B6mstads%20Kommun/Kyrkosund" },
    { id: "reso", name: "Resö", lat: 58.8033, lng: 11.1200, guideName: "Resö Gästhamn", guideUrl: "https://harbourguide.com/no/search?q=Resö", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2682691/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Tanum%20Municipality/Res%C3%B6" },
    { id: "vettnet", name: "Vettnet (Nord-Koster)", lat: 58.9036, lng: 11.0264, guideName: "Nord-Koster Vättnet", guideUrl: "https://harbourguide.com/no/search?q=Vettnet", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2663288/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Str%C3%B6mstads%20Kommun/Vettnet" },
    { id: "verdens_ende", name: "Verdens Ende", lat: 59.0558, lng: 10.4075, guideName: "Verdens Ende", guideUrl: "https://harbourguide.com/no/search?q=Verdens Ende", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-33449/Norge/Vestfold/F%C3%A6rder/Verdens%20ende" },
    { id: "nevlunghavn", name: "Nevlunghavn", lat: 58.9689, lng: 9.8647, guideName: "Nevlunghavn gjestehavn", guideUrl: "https://harbourguide.com/no/search?q=Nevlunghavn", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-2783331/Norge/Vestfold/Larvik/Nevlunghavn" },
    { id: "ildverket", name: "Ildverket", lat: 59.1350, lng: 10.4500, guideName: "Ildverket - Nordbrygga", guideUrl: "https://harbourguide.com/no/search?q=Ildverket", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-33338/Norge/Vestfold/F%C3%A6rder/Ildverket" },
    { id: "engelsviken", name: "Engelsviken", lat: 59.2589, lng: 10.7350, guideName: "Engelsviken", guideUrl: "https://harbourguide.com/no/search?q=Engelsviken", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-33478/Norge/%C3%98stfold/Fredrikstad/Engelsviken" },
    { id: "teibern", name: "Teibern (Larkollen)", lat: 59.3330, lng: 10.6620, guideName: "Arbeidernes Båtforening Moss – Teibern", guideUrl: "https://harbourguide.com/no/search?q=Teibern", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-2779456/Norge/%C3%98stfold/Moss/Larkollen%20lykt" },
    { id: "skjaerhalden", name: "Skjærhalden", lat: 59.0239, lng: 11.0314, guideName: "Skjærhalden Gjestehavn", guideUrl: "https://harbourguide.com/no/search?q=Skjærhalden", webcamUrl: "https://assets2.webcam.io/w/PV1O39/latest_hd.jpg?1751272569054", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-34249/Norge/%C3%98stfold/Hvaler/Skj%C3%A6rhalden" },
    { id: "stroemstad", name: "Strømstad", lat: 58.9378, lng: 11.1714, guideName: "Strömstad Marina AB", guideUrl: "https://harbourguide.com/no/search?q=Strømstad", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2671224/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Str%C3%B6mstads%20Kommun/Str%C3%B6mstad" },
    { id: "ramsoe", name: "Ramsö", lat: 58.8319, lng: 11.0660, guideName: "Ramsö", guideUrl: "https://harbourguide.com/no/search?q=Ramsö", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2683323/Sverige/V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n/Rams%C3%B6" },
    { id: "stavern", name: "Stavern", lat: 59.0003, lng: 10.0353, guideName: "Stavern Gjestehavn", guideUrl: "https://harbourguide.com/no/search?q=Stavern", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-23236/Norge/Vestfold/Larvik/Stavernsodden" },
    { id: "nordre_lauer", name: "Nordre Lauer", lat: 59.0044, lng: 11.0183, guideName: "Nordre Lauer gjestehavn", guideUrl: "https://harbourguide.com/no/search?q=Nordre Lauer", webcamUrl: "", yrUrl: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-34257/Norge/%C3%98stfold/Hvaler/Nordre%20Lauer" }
];

const DEFAULT_DINNERS = [
    "Pasta bolognese", "Pasta carbonara", "Pølser med lomper/mos", "Gryterett",
    "Tomatsuppe", "Pizza", "Fiskekaker med mos", "Pannekaker",
    "Enkel taco/wraps", "Omelett", "Ostesmørbrød", "Røkt laks/ørret og pasta",
    "Kjøttboller og potetmos", "Koteletter og potetmos", "Fiskeburger", "Hamburger"
];

const state = {
    startDate: "24/07/2026",
    boatSpeed: 6.0,
    dinners: [...DEFAULT_DINNERS],
    harbors: [...SEED_HARBORS],
    routeDays: [
        { dateOffset: 0, harborId: "saetre", dinner: "Pasta bolognese", customNotes: "Mønstring og klargjøring av båt.", customWeather: null, booked: true },
        { dateOffset: 1, harborId: "horten", dinner: "Enkel taco/wraps", customNotes: "Husk å sjekke diesel og ferskvann.", customWeather: null, booked: false },
        { dateOffset: 2, harborId: "bolaerne", dinner: "Hamburger", customNotes: "Fin natursti her.", customWeather: null, booked: false },
        { dateOffset: 3, harborId: "skjaerhalden", dinner: "Fiskeburger", customNotes: "Krysser fjorden i dag.", customWeather: null, booked: true }
    ],
    selectedTab: "planner"
};

let liveWeatherData = {};
let fetchStatus = {}; 
let weatherChartInstance = null;

function safeLocalStorageGet(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        if (val === "undefined" || val === "null") return fallback;
        return val ? JSON.parse(val) : fallback;
    } catch (e) {
        return fallback;
    }
}

function safeLocalStorageSet(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
}

function loadSavedState() {
    try {
        const savedDate = localStorage.getItem("seil_startDate");
        if (savedDate && savedDate !== "undefined") {
            if (savedDate.startsWith('"') && savedDate.endsWith('"')) state.startDate = JSON.parse(savedDate);
            else state.startDate = savedDate;
        }
    } catch (e) { console.error("startDate restore failed", e); }

    try {
        const savedSpeed = localStorage.getItem("seil_boatSpeed");
        if (savedSpeed && savedSpeed !== "undefined") state.boatSpeed = parseFloat(savedSpeed);
    } catch (e) { console.error("boatSpeed restore failed", e); }

    try {
        const savedDinners = localStorage.getItem("seil_dinners");
        if (savedDinners && savedDinners !== "undefined") {
            const parsed = JSON.parse(savedDinners);
            if (Array.isArray(parsed) && parsed.length > 0) state.dinners = parsed;
        }
    } catch (e) { console.error("dinners restore failed", e); }

    try {
        const savedHarbors = localStorage.getItem("seil_harbors");
        if (savedHarbors && savedHarbors !== "undefined") {
            const parsed = JSON.parse(savedHarbors);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const validated = parsed.filter(h => h && typeof h === 'object' && h.id && typeof h.lat === 'number' && typeof h.lng === 'number');
                if (validated.length > 0) state.harbors = validated;
            }
        }
    } catch (e) { console.error("harbors restore failed", e); }

    try {
        const savedRoute = localStorage.getItem("seil_routeDays");
        if (savedRoute && savedRoute !== "undefined") {
            const parsed = JSON.parse(savedRoute);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const validated = parsed.filter(day => day && typeof day === 'object' && day.harborId);
                if (validated.length > 0) state.routeDays = validated;
            }
        }
    } catch (e) { console.error("routeDays restore failed", e); }
}

function persistState() {
    safeLocalStorageSet("seil_startDate", state.startDate);
    safeLocalStorageSet("seil_boatSpeed", state.boatSpeed);
    safeLocalStorageSet("seil_dinners", state.dinners);
    safeLocalStorageSet("seil_harbors", state.harbors);
    safeLocalStorageSet("seil_routeDays", state.routeDays);
}

function getSavedRoutes() {
    return safeLocalStorageGet("seil_saved_routes", []);
}

function saveCurrentRoute() {
    const nameInput = document.getElementById("input-route-name");
    let name = nameInput.value.trim();
    if (!name) name = "Rute " + new Date().toLocaleDateString("no-NO");
    
    const savedRoutes = getSavedRoutes();
    const newRoute = {
        id: Date.now().toString(), name: name, startDate: state.startDate, boatSpeed: state.boatSpeed,
        routeDays: JSON.parse(JSON.stringify(state.routeDays)), dinners: JSON.parse(JSON.stringify(state.dinners))
    };
    
    savedRoutes.push(newRoute);
    safeLocalStorageSet("seil_saved_routes", savedRoutes);
    nameInput.value = "";
    showToast(`Ruten "${name}" ble lagret!`, "success");
    renderAll();
}

function loadSavedRoute(id) {
    const savedRoutes = getSavedRoutes();
    const route = savedRoutes.find(r => r.id === id);
    if (!route) return;
    
    state.startDate = route.startDate;
    if (route.boatSpeed) state.boatSpeed = parseFloat(route.boatSpeed);
    state.routeDays = JSON.parse(JSON.stringify(route.routeDays));
    if (route.dinners) state.dinners = JSON.parse(JSON.stringify(route.dinners));
    
    persistState();
    showToast(`Lastet inn rute: "${route.name}"`, "success");
    renderAll();
}

function deleteSavedRoute(id) {
    let savedRoutes = getSavedRoutes();
    const routeToDelete = savedRoutes.find(r => r.id === id);
    const name = routeToDelete ? routeToDelete.name : "";
    
    savedRoutes = savedRoutes.filter(r => r.id !== id);
    safeLocalStorageSet("seil_saved_routes", savedRoutes);
    showToast(`Ruten "${name}" ble slettet.`, "success");
    renderAll();
}

function realignOffsets() {
    state.routeDays.forEach((day, i) => { day.dateOffset = i; });
}

function updateDayHarbor(index, harborId) {
    state.routeDays[index].harborId = harborId;
    persistState();
    const key = `${index}_${harborId}`;
    delete fetchStatus[key];
    delete liveWeatherData[key];
    renderAll();
}

function updateDayDinner(index, dinnerVal) {
    state.routeDays[index].dinner = dinnerVal;
    persistState();
    renderAll();
}

function updateDayNotes(index, notesVal) {
    state.routeDays[index].customNotes = notesVal;
    persistState();
}

function updateWeatherSlider(index, key, value) {
    const currentHarborId = state.routeDays[index].harborId;
    const liveKey = `${index}_${currentHarborId}`;
    const baseWeather = liveWeatherData[liveKey] || generateWeather(currentHarborId, index);

    if (!state.routeDays[index].customWeather) {
        state.routeDays[index].customWeather = {
            temp: typeof baseWeather.temp === 'number' ? baseWeather.temp : 18.0,
            windSpeed: typeof baseWeather.windSpeed === 'number' ? baseWeather.windSpeed : 4.0,
            gusts: typeof baseWeather.gusts === 'number' ? baseWeather.gusts : 6.0,
            condition: baseWeather.condition !== "-" ? baseWeather.condition : "Sunny",
            rainAmount: typeof baseWeather.rainAmount === 'number' ? baseWeather.rainAmount : 0.0,
            windDir: baseWeather.windDir !== "-" ? baseWeather.windDir : "S",
            isLive: false
        };
    }
    state.routeDays[index].customWeather[key] = parseFloat(value);
    persistState();
    renderAll();
}

function resetCustomWeather(index) {
    state.routeDays[index].customWeather = null;
    persistState();
    renderAll();
}

function addNewDay() {
    const lastDay = state.routeDays[state.routeDays.length - 1];
    const nextOffset = lastDay ? lastDay.dateOffset + 1 : 0;
    const nextHarbor = lastDay ? lastDay.harborId : state.harbors[0].id;
    state.routeDays.push({
        dateOffset: nextOffset, harborId: nextHarbor, dinner: state.dinners[nextOffset % state.dinners.length] || "",
        customNotes: "", customWeather: null, booked: false
    });
    persistState();
    renderAll();
}

function insertDayAfter(index) {
    const currentDay = state.routeDays[index];
    const nextHarbor = currentDay ? currentDay.harborId : state.harbors[0].id;
    const nextDinner = state.dinners[(index + 1) % state.dinners.length] || "";
    state.routeDays.splice(index + 1, 0, {
        dateOffset: 0, harborId: nextHarbor, dinner: nextDinner,
        customNotes: "", customWeather: null, booked: false
    });
    realignOffsets();
    persistState();
    renderAll();
}

function toggleBooked(index, isBooked) {
    state.routeDays[index].booked = isBooked;
    persistState();
    renderAll();
}

function removeDay(index) {
    const day = state.routeDays[index];
    if (day && day.booked) {
        showToast("Denne seiledagen er låst (bestilt). Lås opp bestillingen for å slette.", "error");
        return;
    }
    if (state.routeDays.length <= 1) return;
    state.routeDays.splice(index, 1);
    realignOffsets();
    persistState();
    renderAll();
}

function moveDay(index, direction) {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === state.routeDays.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = { ...state.routeDays[index] };
    
    state.routeDays[index].harborId = state.routeDays[targetIndex].harborId;
    state.routeDays[index].dinner = state.routeDays[targetIndex].dinner;
    state.routeDays[index].customNotes = state.routeDays[targetIndex].customNotes;
    state.routeDays[index].customWeather = state.routeDays[targetIndex].customWeather;
    state.routeDays[index].booked = state.routeDays[targetIndex].booked;

    state.routeDays[targetIndex].harborId = temp.harborId;
    state.routeDays[targetIndex].dinner = temp.dinner;
    state.routeDays[targetIndex].customNotes = temp.customNotes;
    state.routeDays[targetIndex].customWeather = temp.customWeather;
    state.routeDays[targetIndex].booked = temp.booked;

    persistState();
    renderAll();
}

function updateBoatSpeed(val) {
    const speed = parseFloat(val);
    if (!isNaN(speed) && speed > 0) {
        state.boatSpeed = speed;
        persistState();
        renderAll();
    }
}

function addDinnerIdea() {
    const input = document.getElementById("new-dinner-input");
    const val = input.value.trim();
    if (!val || state.dinners.includes(val)) return;

    state.dinners.push(val);
    input.value = "";
    persistState();
    renderAll();
}

function removeDinnerIdea(dinner) {
    state.dinners = state.dinners.filter(d => d !== dinner);
    persistState();
    renderAll();
}

function addNewCustomHarbor() {
    const nameEl = document.getElementById("form-harbor-name");
    const latEl = document.getElementById("form-harbor-lat");
    const lngEl = document.getElementById("form-harbor-lng");
    const guideNameEl = document.getElementById("form-harbor-guideName");
    const yrUrlEl = document.getElementById("form-harbor-yrUrl");
    const webcamUrlEl = document.getElementById("form-harbor-webcamUrl");
    const editIdEl = document.getElementById("edit-harbor-id");

    const name = nameEl.value.trim();
    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);

    if (!name || isNaN(lat) || isNaN(lng)) {
        showToast("Vennligst fyll ut navn, breddegrad og lengdegrad.", "error");
        return;
    }

    const guideName = guideNameEl.value.trim();
    const guideUrl = guideName ? `https://harbourguide.com/no/search?q=${encodeURIComponent(guideName)}` : "";
    const yrUrl = yrUrlEl.value.trim();
    const webcamUrl = webcamUrlEl.value.trim();

    if (editIdEl.value) {
        const targetId = editIdEl.value;
        const idx = state.harbors.findIndex(h => h.id === targetId);
        if (idx !== -1) {
            state.harbors[idx] = { id: targetId, name, lat, lng, guideName, guideUrl, webcamUrl, yrUrl };
            showToast(`Havnen "${name}" ble oppdatert!`, "success");
        }
        cancelEditHarbor();
    } else {
        const id = "custom_" + Date.now();
        state.harbors.push({ id, name, lat, lng, guideName, guideUrl, webcamUrl, yrUrl });
        showToast(`Ny havn "${name}" ble lagret!`, "success");
    }

    nameEl.value = ""; latEl.value = ""; lngEl.value = ""; guideNameEl.value = ""; yrUrlEl.value = ""; webcamUrlEl.value = "";
    persistState();
    drawDatabaseMapRoutes();
    renderAll();
}

function editHarbor(id) {
    const h = state.harbors.find(har => har.id === id);
    if (!h) return;

    document.getElementById("edit-harbor-id").value = h.id;
    document.getElementById("form-harbor-name").value = h.name;
    document.getElementById("form-harbor-lat").value = h.lat;
    document.getElementById("form-harbor-lng").value = h.lng;
    document.getElementById("form-harbor-guideName").value = h.guideName || "";
    document.getElementById("form-harbor-yrUrl").value = h.yrUrl || "";
    document.getElementById("form-harbor-webcamUrl").value = h.webcamUrl || "";

    document.getElementById("form-harbor-title").innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-400"></i> Rediger havn: ${h.name}`;
    document.getElementById("btn-harbor-save").innerHTML = `<i class="fa-solid fa-floppy-disk mr-1"></i> Lagre endringer`;
    document.getElementById("btn-harbor-save").className = "flex-1 py-2.5 bg-amber-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-lg";
    document.getElementById("btn-harbor-cancel").classList.remove("hidden");

    document.getElementById("form-harbor-title").scrollIntoView({ behavior: 'smooth' });
    drawDatabaseMapRoutes();
}

function cancelEditHarbor() {
    document.getElementById("edit-harbor-id").value = "";
    document.getElementById("form-harbor-name").value = "";
    document.getElementById("form-harbor-lat").value = "";
    document.getElementById("form-harbor-lng").value = "";
    document.getElementById("form-harbor-guideName").value = "";
    document.getElementById("form-harbor-yrUrl").value = "";
    document.getElementById("form-harbor-webcamUrl").value = "";

    document.getElementById("form-harbor-title").innerHTML = `<i class="fa-solid fa-anchor text-teal-400"></i> Legg til ny havn`;
    document.getElementById("btn-harbor-save").innerHTML = `<i class="fa-solid fa-plus mr-1"></i> Lagre havn`;
    document.getElementById("btn-harbor-save").className = "flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-lg";
    document.getElementById("btn-harbor-cancel").classList.add("hidden");

    drawDatabaseMapRoutes();
}

function deleteHarbor(id) {
    const isUsed = state.routeDays.some(d => d.harborId === id);
    if (isUsed) {
        showToast("Kan ikke slette en havn som er i bruk i ruteplanen din.", "error");
        return;
    }

    if (confirm("Er du sikker på at du vil slette denne havnen fra databasen?")) {
        state.harbors = state.harbors.filter(h => h.id !== id);
        persistState();
        showToast("Havnen ble slettet.", "success");
        drawDatabaseMapRoutes();
        renderAll();
    }
}

function exportTotalBackup() {
    const totalBackup = {
        startDate: state.startDate, boatSpeed: state.boatSpeed, dinners: state.dinners,
        harbors: state.harbors, routeDays: state.routeDays, savedRoutes: getSavedRoutes()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(totalBackup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `seilferie_totalbackup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast("Hele oppsettet ble eksportert som JSON-fil!", "success");
}

function triggerFileInput() {
    document.getElementById("file-import-input").click();
}

function importTotalBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && (data.routeDays || data.harbors)) {
                if (confirm("Vil du overskrive hele ruteplanleggeren, alle lagrede alternativer og dine egne havner med denne sikkerhetskopien?")) {
                    if (data.startDate) state.startDate = data.startDate;
                    if (data.boatSpeed) state.boatSpeed = parseFloat(data.boatSpeed);
                    if (data.dinners && Array.isArray(data.dinners)) state.dinners = data.dinners;
                    if (data.harbors && Array.isArray(data.harbors)) state.harbors = data.harbors;
                    if (data.routeDays && Array.isArray(data.routeDays)) state.routeDays = data.routeDays;
                    if (data.savedRoutes) safeLocalStorageSet("seil_saved_routes", data.savedRoutes);
                    persistState();
                    showToast("Hele oppsettet ble vellykket gjenopprettet!", "success");
                    renderAll();
                }
            } else {
                showToast("Feil: Ugyldig sikkerhetskopifil.", "error");
            }
        } catch (err) {
            showToast("Kunne ikke lese sikkerhetskopifilen.", "error");
        }
        event.target.value = ""; 
    };
    reader.readAsText(file);
}

function confirmReset() {
    localStorage.clear();
    state.startDate = "24/07/2026";
    state.boatSpeed = 6.0;
    state.dinners = [...DEFAULT_DINNERS];
    state.harbors = [...SEED_HARBORS];
    state.routeDays = [{ dateOffset: 0, harborId: "saetre", dinner: state.dinners[0], customNotes: "", customWeather: null, booked: false }];
    persistState();
    closeResetModal();
    showToast("Systemet ble fullstendig tilbakestilt!", "success");
    renderAll();
}
