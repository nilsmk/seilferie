// UI rendering and tab management

function switchTab(tabId) {
    state.selectedTab = tabId;
    
    document.getElementById("tab-content-planner").classList.add("hidden");
    document.getElementById("tab-content-dinners").classList.add("hidden");
    document.getElementById("tab-content-database").classList.add("hidden");
    document.getElementById("tab-content-summary").classList.add("hidden");

    document.querySelectorAll("nav button").forEach(btn => {
        btn.className = "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition duration-200 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-900";
    });

    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition duration-200 flex items-center gap-2 bg-marine-600 text-white shadow-md";
    }

    const activeTabContent = document.getElementById(`tab-content-${tabId}`);
    if (activeTabContent) {
        activeTabContent.classList.remove("hidden");
    }

    if (tabId === "planner") setTimeout(() => { if (map) map.invalidateSize(); }, 150);
    if (tabId === "database") {
        setTimeout(() => {
            initializeDatabaseMap();
            if (dbMap) { dbMap.invalidateSize(); drawDatabaseMapRoutes(); }
        }, 150);
    }
    if (tabId === "summary") {
        setTimeout(() => {
            initializeSummaryMap();
            if (summaryMap) { summaryMap.invalidateSize(); drawSummaryMapRoute(); }
        }, 150);
    }
    renderAll();
}

function renderSavedRoutesList() {
    const listContainer = document.getElementById("saved-routes-list");
    if (!listContainer) return;
    
    const savedRoutes = getSavedRoutes();
    if (savedRoutes.length === 0) {
        listContainer.innerHTML = `<p class="text-[10px] text-slate-500 italic">Ingen lagrede alternativer ennå.</p>`;
        return;
    }
    
    listContainer.innerHTML = savedRoutes.map(r => `
        <div class="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-900 text-xs">
            <span class="font-semibold text-slate-300 truncate max-w-[140px]" title="${r.name}">${r.name}</span>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="loadSavedRoute('${r.id}')" class="px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded text-[10px] font-bold" title="Last inn rute">
                    Åpne
                </button>
                <button onclick="deleteSavedRoute('${r.id}')" class="p-1 text-rose-400 hover:bg-rose-500/10 rounded" title="Slett rute">
                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderAll() {
    if (!state.harbors || !Array.isArray(state.harbors) || state.harbors.length === 0) state.harbors = [...SEED_HARBORS];
    if (!state.dinners || !Array.isArray(state.dinners) || state.dinners.length === 0) state.dinners = [...DEFAULT_DINNERS];
    if (!state.routeDays || !Array.isArray(state.routeDays) || state.routeDays.length === 0) {
        state.routeDays = [{ dateOffset: 0, harborId: "saetre", dinner: "Pasta bolognese", customNotes: "Mønstring og klargjøring av båt.", customWeather: null, booked: true }];
    }

    state.routeDays = state.routeDays.filter(day => day && typeof day === 'object' && day.harborId);
    document.getElementById("input-boat-speed").value = state.boatSpeed;

    let totalNM = 0; let totalKM = 0; let rainAlerts = 0; let windAlerts = 0;
    const calculatedDistances = []; const weatherSnapshots = [];

    state.routeDays.forEach((day, i) => {
        const liveKey = `${i}_${day.harborId}`;
        let weather;

        if (day.customWeather) weather = day.customWeather;
        else if (liveWeatherData[liveKey]) weather = liveWeatherData[liveKey];
        else {
            weather = generateWeather(day.harborId, i);
            if (!fetchStatus[liveKey]) fetchMETWeather(i, day.harborId);
        }

        weatherSnapshots.push(weather);

        const isRainy = typeof weather.rainAmount === 'number' && (weather.condition === "Rainy" || weather.rainAmount > 0);
        const isWindy = typeof weather.windSpeed === 'number' && weather.windSpeed > 7;
        const isGusty = typeof weather.gusts === 'number' && weather.gusts > 10;

        if (isRainy) rainAlerts++;
        if (isWindy || isGusty) windAlerts++;

        if (i === 0) calculatedDistances.push({ nm: 0, km: 0 });
        else {
            const prevHarbor = state.harbors.find(h => h.id === state.routeDays[i-1].harborId);
            const currHarbor = state.harbors.find(h => h.id === day.harborId);
            if (prevHarbor && currHarbor) {
                const dist = calculateDistance(prevHarbor.lat, prevHarbor.lng, currHarbor.lat, currHarbor.lng);
                totalNM += dist.nm; totalKM += dist.km; calculatedDistances.push(dist);
            } else calculatedDistances.push({ nm: 0, km: 0 });
        }
    });

    const totalTravelTimeFormatted = formatTravelTime(totalNM, state.boatSpeed);
    document.getElementById("stat-days").innerText = `${state.routeDays.length} Dager`;
    document.getElementById("stat-distance").innerText = `${totalNM.toFixed(1)} NM (${totalKM.toFixed(0)} km) ${totalTravelTimeFormatted}`;
    document.getElementById("stat-wind-alerts").innerText = `${windAlerts} dager`;
    document.getElementById("stat-rain-alerts").innerText = `${rainAlerts} dager`;

    renderSavedRoutesList();

    const container = document.getElementById("day-cards-container");
    container.innerHTML = "";

    state.routeDays.forEach((day, index) => {
        const harbor = state.harbors.find(h => h.id === day.harborId) || state.harbors[0];
        const weather = weatherSnapshots[index] || generateWeather(day.harborId, index);
        const distance = calculatedDistances[index] || { nm: 0, km: 0 };

        const isRainy = typeof weather.rainAmount === 'number' && (weather.condition === "Rainy" || weather.rainAmount > 0);
        const isWindy = typeof weather.windSpeed === 'number' && weather.windSpeed > 7;
        const isGusty = typeof weather.gusts === 'number' && weather.gusts > 10;
        const hasWarnings = isRainy || isWindy || isGusty;
        const isBooked = !!day.booked;

        let dinnerOptions = state.dinners.map(din => `<option value="${din}" ${day.dinner === din ? 'selected' : ''}>${din}</option>`).join('');

        const liveKey = `${index}_${day.harborId}`;
        const weatherFetchStatus = fetchStatus[liveKey];

        let weatherBadgeHtml = "";
        let graphButtonHtml = "";

        if (day.customWeather) {
            weatherBadgeHtml = `<span class="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-sliders"></i> Simulert (Egendefinert)</span>`;
        } else if (weatherFetchStatus === "loading") {
            weatherBadgeHtml = `<span class="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-spinner animate-spin"></i> Henter...</span>`;
        } else if (weather.isLive) {
            if (weather.source === "met_subseasonal") {
                weatherBadgeHtml = `<span class="bg-sky-500/15 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-satellite"></i> 🔵 MET 21-dagersvarsel</span>`;
            } else if (weather.source === "ecmwf") {
                weatherBadgeHtml = `<span class="bg-purple-500/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-earth-europe"></i> 🟣 ECMWF 15-dagersvarsel</span>`;
            } else {
                weatherBadgeHtml = `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-satellite"></i> 🟢 Live MET-varsel</span>`;
            }
            
            if (weather.graphData && weather.graphData.labels.length > 0) {
                graphButtonHtml = `<button onclick="openChartModal(${index})" class="text-[10px] text-slate-900 bg-teal-400 hover:bg-teal-300 font-bold px-2 py-0.5 rounded transition shadow-md flex items-center gap-1.5"><i class="fa-solid fa-chart-line"></i> Vis graf</button>`;
            }
        } else {
            weatherBadgeHtml = `<span class="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> ⏳ Simulert (Ingen live-data)</span>`;
        }

        const legTravelTimeFormatted = index === 0 ? '' : ` (~${formatTravelTime(distance.nm, state.boatSpeed)})`;

        const cardHtml = `
            <div class="bg-slate-900 rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${isBooked ? 'border-emerald-500/60 ring-2 ring-emerald-500/10' : hasWarnings ? 'border-amber-500/30 ring-1 ring-amber-500/10' : 'border-slate-800'} no-print">
                <div class="bg-slate-900 border-b border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold ${isBooked ? 'text-emerald-400' : 'text-teal-400'}">
                            D${index + 1}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-bold text-white">${formatNorwegianDate(state.startDate, day.dateOffset)}</p>
                                ${isBooked ? '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1"><i class="fa-solid fa-lock text-[8px]"></i> BESTILT</span>' : ''}
                            </div>
                            <p class="text-xs text-slate-400">Leggdistanse: ${index === 0 ? 'Startsted' : distance.nm.toFixed(1) + ' NM (' + distance.km.toFixed(1) + ' km)' + legTravelTimeFormatted}</p>
                        </div>
                    </div>

                    <div class="flex items-center space-x-1.5">
                        <button onclick="moveDay(${index}, 'up')" ${index === 0 || isBooked ? 'disabled' : ''} class="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30">
                            <i class="fa-solid fa-chevron-up text-xs"></i>
                        </button>
                        <button onclick="moveDay(${index}, 'down')" ${index === state.routeDays.length - 1 || isBooked ? 'disabled' : ''} class="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30">
                            <i class="fa-solid fa-chevron-down text-xs"></i>
                        </button>
                        <button onclick="removeDay(${index})" ${isBooked ? 'disabled' : ''} class="p-1.5 bg-slate-950 border border-rose-950/40 text-rose-400 hover:bg-rose-500 hover:text-white rounded ml-2 disabled:opacity-20">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>

                <div class="p-5 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Destinasjonshavn</label>
                                <label class="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input type="checkbox" class="hidden" onchange="toggleBooked(${index}, this.checked)" ${isBooked ? 'checked' : ''} />
                                    <span class="text-[10px] font-bold flex items-center gap-1 ${isBooked ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'} transition">
                                        <i class="fa-solid ${isBooked ? 'fa-lock' : 'fa-lock-open'}"></i>
                                        ${isBooked ? 'Bestilt' : 'Marker som bestilt'}
                                    </span>
                                </label>
                            </div>
                            
                            <select onchange="updateDayHarbor(${index}, this.value)" ${isBooked ? 'disabled' : ''} class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none ${isBooked ? 'opacity-65 cursor-not-allowed border-emerald-950 text-emerald-100' : ''}">
                                ${state.harbors.map(h => `<option value="${h.id}" ${day.harborId === h.id ? 'selected':''}>${h.name}</option>`).join('')}
                            </select>

                            <div class="mt-3 flex flex-wrap gap-2">
                                ${harbor.guideUrl ? `<a href="${harbor.guideUrl}" target="_blank" class="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-teal-400 rounded-lg text-xs font-semibold flex items-center border border-slate-800 transition"><i class="fa-solid fa-book-open text-teal-400 mr-1.5"></i>Havneguide</a>` : ''}
                                ${harbor.webcamUrl ? `<a href="${harbor.webcamUrl}" target="_blank" class="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-cyan-400 rounded-lg text-xs font-semibold flex items-center border border-slate-800 transition"><i class="fa-solid fa-camera text-cyan-400 mr-1.5"></i>Kamera</a>` : ''}
                                ${harbor.yrUrl ? `<a href="${harbor.yrUrl}" target="_blank" class="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-sky-400 rounded-lg text-xs font-semibold flex items-center border border-slate-800 transition"><i class="fa-solid fa-cloud text-sky-400 mr-1.5"></i>Yr</a>` : ''}
                            </div>
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Dagens Middag</label>
                            <select onchange="updateDayDinner(${index}, this.value)" class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none">
                                <option value="">-- Velg middag --</option>
                                ${dinnerOptions}
                                <option value="custom_input" ${(!state.dinners.includes(day.dinner) && day.dinner !== "") ? 'selected' : ''}>✏️ Skriv inn annet...</option>
                            </select>

                            ${(!state.dinners.includes(day.dinner) && day.dinner !== "") ? `
                                <input type="text" value="${day.dinner}" placeholder="Angi rett..." oninput="updateDayDinner(${index}, this.value)" class="w-full mt-2 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 outline-none"/>
                            ` : ''}
                        </div>
                    </div>

                    <!-- WEATHER DISPLAY -->
                    <div id="weather-box-${index}" class="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-900 pb-2">
                            <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <i class="fa-solid ${getWeatherIconClass(weather)}"></i>
                                Værvarsel for ${harbor.name} (MET)
                            </span>
                            <div class="flex items-center gap-2">
                                ${weatherBadgeHtml}
                                ${graphButtonHtml}
                                ${day.customWeather ? `
                                    <button onclick="resetCustomWeather(${index})" class="text-[10px] text-teal-400 hover:underline"><i class="fa-solid fa-rotate-left"></i> Gjenopprett</button>
                                `:''}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div class="bg-slate-900/60 p-2 rounded-lg">
                                <span class="block text-[9px] text-slate-500 font-bold uppercase">Temperatur</span>
                                <span class="text-sm font-extrabold text-white">
                                    ${typeof weather.temp === 'number' ? weather.temp.toFixed(1) + '°C' : '-'}
                                </span>
                            </div>
                            <div class="bg-slate-900/60 p-2 rounded-lg">
                                <span class="block text-[9px] text-slate-500 font-bold uppercase">Middelvind</span>
                                <span class="text-sm font-extrabold block ${typeof weather.windSpeed === 'number' && weather.windSpeed > 7 ? 'text-amber-400 animate-pulse' : 'text-white'}">
                                    ${typeof weather.windSpeed === 'number' ? weather.windSpeed + ' m/s ' + getWindArrowHtml(weather.windDir) : '-'}
                                </span>
                            </div>
                            <div class="bg-slate-900/60 p-2 rounded-lg">
                                <span class="block text-[9px] text-slate-500 font-bold uppercase">Vindkast</span>
                                <span class="text-sm font-extrabold block ${typeof weather.gusts === 'number' && weather.gusts > 10 ? 'text-rose-400 animate-pulse' : 'text-white'}">
                                    ${typeof weather.gusts === 'number' ? weather.gusts + ' m/s' : '-'}
                                </span>
                            </div>
                            <div class="bg-slate-900/60 p-2 rounded-lg">
                                <span class="block text-[9px] text-slate-500 font-bold uppercase">Nedbør</span>
                                <span class="text-sm font-extrabold block ${typeof weather.rainAmount === 'number' && weather.rainAmount > 0 ? 'text-sky-400' : 'text-slate-400'}">
                                    ${typeof weather.rainAmount === 'number' ? weather.rainAmount.toFixed(1) + ' mm' : '-'}
                                </span>
                            </div>
                        </div>

                        <!-- SAFETY NOTICES -->
                        ${hasWarnings ? `
                            <div class="flex flex-wrap gap-2 mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-amber-500/10 text-xs">
                                <span class="font-bold text-amber-400 flex items-center mr-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Risiko:</span>
                                ${isRainy ? `<span class="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-semibold"><i class="fa-solid fa-cloud-showers-heavy"></i> Regn meldt</span>` : ''}
                                ${isWindy ? `<span class="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-semibold"><i class="fa-solid fa-wind animate-pulse"></i> Vind &gt; 7m/s</span>` : ''}
                                ${isGusty ? `<span class="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-semibold"><i class="fa-solid fa-bolt-lightning animate-pulse"></i> Kast &gt; 10m/s</span>` : ''}
                            </div>
                        ` : ''}

                        <!-- CUSTOM TESTING RANGE SLIDERS -->
                        <div class="pt-2 border-t border-slate-900">
                            <details class="group">
                                <summary class="list-none flex items-center justify-between cursor-pointer text-xs text-slate-500 font-semibold group-open:text-white">
                                    <span><i class="fa-solid fa-sliders text-teal-500 mr-1"></i> Simuler endrede værforhold</span>
                                    <i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i>
                                </summary>
                                <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 p-3 rounded-lg">
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-1">Middelvind: ${typeof weather.windSpeed === 'number' ? weather.windSpeed + ' m/s' : '-'}</label>
                                        <input type="range" min="0" max="15" step="0.5" value="${typeof weather.windSpeed === 'number' ? weather.windSpeed : 0}" oninput="updateWeatherSlider(${index}, 'windSpeed', this.value)" class="w-full accent-teal-500"/>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-1">Vindkast: ${typeof weather.gusts === 'number' ? weather.gusts + ' m/s' : '-'}</label>
                                        <input type="range" min="0" max="25" step="0.5" value="${typeof weather.gusts === 'number' ? weather.gusts : 0}" oninput="updateWeatherSlider(${index}, 'gusts', this.value)" class="w-full accent-rose-500"/>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-1">Regn: ${typeof weather.rainAmount === 'number' ? weather.rainAmount + ' mm' : '-'}</label>
                                        <input type="range" min="0" max="12" step="0.2" value="${typeof weather.rainAmount === 'number' ? weather.rainAmount : 0}" oninput="updateWeatherSlider(${index}, 'rainAmount', this.value)" class="w-full accent-sky-500"/>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Merknader &amp; Huskeliste</label>
                        <textarea oninput="updateDayNotes(${index}, this.value)" placeholder="F.eks. handle rødvin, betale havneavgift, hente ferske rundstykker..." rows="2" class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 outline-none">${day.customNotes || ''}</textarea>
                    </div>
                </div>
            </div>

            <!-- INTERACTIVE IN-BETWEEN INSERTION POINT -->
            <div class="relative flex items-center justify-center group py-2 -my-2 no-print">
                <div class="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <button onclick="insertDayAfter(${index})" class="relative z-10 px-3 py-1 bg-slate-950 hover:bg-teal-500 hover:text-slate-950 border border-slate-800 hover:border-teal-400 rounded-full text-[10px] font-bold text-slate-400 shadow-md transition-all duration-200 flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-circle-plus text-teal-400 group-hover:text-slate-950"></i>
                    Sett inn stoppested her
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Render Dinners Tab
    const dinnersGrid = document.getElementById("dinners-list-grid");
    dinnersGrid.innerHTML = "";
    state.dinners.forEach(din => {
        const isSelectedCount = state.routeDays.filter(d => d.dinner === din).length;
        const itemHtml = `
            <div class="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:border-slate-700 transition">
                <div>
                    <p class="text-sm font-bold text-slate-100">${din}</p>
                    <p class="text-[9px] font-semibold text-teal-400 uppercase tracking-wider mt-1">${isSelectedCount > 0 ? 'Brukt på ' + isSelectedCount + ' dager' : 'Klar for valg'}</p>
                </div>
                <button onclick="removeDinnerIdea('${din}')" class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
        dinnersGrid.insertAdjacentHTML('beforeend', itemHtml);
    });

    // Render Database Tab
    const tableBody = document.getElementById("harbor-table-body");
    tableBody.innerHTML = "";
    state.harbors.forEach(h => {
        const isPlanned = state.routeDays.some(d => d.harborId === h.id);
        const rowHtml = `
            <tr class="border-b border-slate-800/60 hover:bg-slate-950/40 transition">
                <td class="px-3 py-3 font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-location-dot ${isPlanned ? 'text-teal-400' : 'text-slate-600'}"></i>
                    ${h.name}
                </td>
                <td class="px-3 py-3 font-mono text-[10px] text-slate-400">${h.lat.toFixed(4)}°N, ${h.lng.toFixed(4)}°Ø</td>
                <td class="px-3 py-3 space-x-1.5 whitespace-nowrap">
                    ${h.guideUrl ? `<a href="${h.guideUrl}" target="_blank" class="text-teal-400 hover:underline font-semibold" title="Havneguide"><i class="fa-solid fa-book-open"></i> Guide</a>` : ''}
                    ${h.webcamUrl ? `<a href="${h.webcamUrl}" target="_blank" class="text-cyan-400 hover:underline font-semibold" title="Livekamera"><i class="fa-solid fa-camera"></i> Kamera</a>` : ''}
                    <a href="${h.yrUrl || 'https://www.yr.no'}" target="_blank" class="text-sky-400 hover:underline font-semibold" title="Yr-varsel"><i class="fa-solid fa-cloud"></i> Yr</a>
                </td>
                <td class="px-3 py-3 text-right whitespace-nowrap">
                    <button onclick="editHarbor('${h.id}')" class="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded text-[10px] font-bold transition mr-1">
                        <i class="fa-solid fa-pen-to-square"></i> Rediger
                    </button>
                    <button onclick="deleteHarbor('${h.id}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded text-[10px] font-bold transition">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', rowHtml);
    });

    // Render Printable Summary Tab
    document.getElementById("print-start-date").innerText = formatNorwegianDate(state.startDate, 0);
    document.getElementById("print-total-days").innerText = `${state.routeDays.length} Dager`;
    document.getElementById("print-total-distance").innerText = `${totalNM.toFixed(1)} NM (${totalKM.toFixed(0)} km) ${totalTravelTimeFormatted}`;

    // Compile warnings
    const warningList = document.getElementById("print-warnings-list");
    warningList.innerHTML = "";
    let summaryWarningsCount = 0;

    state.routeDays.forEach((day, i) => {
        const weather = weatherSnapshots[i];
        const harbor = state.harbors.find(h => h.id === day.harborId) || state.harbors[0];

        const isRainy = typeof weather.rainAmount === 'number' && (weather.condition === "Rainy" || weather.rainAmount > 0);
        const isWindy = typeof weather.windSpeed === 'number' && weather.windSpeed > 7;
        const isGusty = typeof weather.gusts === 'number' && weather.gusts > 10;

        if (isRainy || isWindy || isGusty) {
            summaryWarningsCount++;
            const items = [];
            if (isRainy) items.push(`Regn (${weather.rainAmount.toFixed(1)} mm)`);
            if (isWindy) items.push(`Middelvind over sikkerhetsgrense (${weather.windSpeed} m/s)`);
            if (isGusty) items.push(`Sterke vindkast (${weather.gusts} m/s)`);

            const li = document.createElement("li");
            li.className = "text-amber-950 font-medium";
            li.innerHTML = `<strong>Dag ${i + 1} (${harbor.name}):</strong> ${items.join(', ')}`;
            warningList.appendChild(li);
        }
    });

    const warningsContainer = document.getElementById("print-warnings-container");
    if (summaryWarningsCount > 0) {
        warningsContainer.classList.remove("hidden");
    } else {
        warningsContainer.classList.add("hidden");
    }

    // Timeline container
    const printTimeline = document.getElementById("print-timeline-container");
    printTimeline.innerHTML = "";
    state.routeDays.forEach((day, i) => {
        const harbor = state.harbors.find(h => h.id === day.harborId) || state.harbors[0];
        const weather = weatherSnapshots[i];
        const distance = calculatedDistances[i];
        const isBooked = !!day.booked;

        const dayHtml = `
            <div class="p-4 bg-white border border-slate-300 rounded-xl space-y-2 text-slate-900 ${isBooked ? 'border-l-4 border-l-emerald-500' : ''}">
                <div class="flex justify-between items-center border-b pb-1">
                    <span class="font-extrabold text-sm text-teal-800 flex items-center gap-1.5">
                        DAG ${i + 1} - ${formatNorwegianDate(state.startDate, day.dateOffset)}
                        ${isBooked ? '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded-md"><i class="fa-solid fa-lock text-[8px]"></i> BESTILT &amp; LÅST</span>' : ''}
                    </span>
                    <span class="text-xs font-semibold text-slate-500">
                        ${i === 0 ? 'Startsted' : '+' + distance.nm.toFixed(1) + ' NM (~' + formatTravelTime(distance.nm, state.boatSpeed) + ')'}
                    </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                        <span class="block text-[10px] text-slate-400 font-bold uppercase">Sted</span>
                        <span class="font-bold text-slate-900 text-sm">${harbor.name}</span>
                        <span class="block text-slate-500 text-[10px]">${harbor.guideName || ''}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-400 font-bold uppercase">Middag</span>
                        <span class="font-bold text-slate-900 text-sm">${day.dinner || 'Ikke bestemt'}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-400 font-bold uppercase">Værforhold</span>
                        <span class="font-medium text-slate-700 block">
                            Temp: ${typeof weather.temp === 'number' ? weather.temp.toFixed(1) + '°C' : '-'}, 
                            Vind: ${typeof weather.windSpeed === 'number' ? weather.windSpeed + ' m/s ' + weather.windDir : '-'}, 
                            Kast: ${typeof weather.gusts === 'number' ? weather.gusts + ' m/s' : '-'}. 
                            ${weather.isLive ? (weather.source === 'met_subseasonal' ? '(MET 21-dagers)' : (weather.source === 'ecmwf' ? '(ECMWF)' : '(Live MET)')) : '(Intet varsel)'}
                        </span>
                    </div>
                </div>
                ${day.customNotes ? `
                    <div class="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-600 mt-1">
                        <strong>Logg / Notater:</strong> ${day.customNotes}
                    </div>
                `:''}
            </div>
        `;
        printTimeline.insertAdjacentHTML('beforeend', dayHtml);
    });

    // Update maps safely based on container visibility
    drawMapRoute();
    if (dbMap && state.selectedTab === "database") {
        drawDatabaseMapRoutes();
    }
    if (summaryMap && state.selectedTab === "summary") {
        drawSummaryMapRoute();
    }
}

function initializeDatePicker() {
    try {
        let fpLocale = "no";
        if (typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.no) fpLocale = flatpickr.l10ns.no;
        flatpickr("#input-start-date", {
            locale: fpLocale,
            dateFormat: "d/m/Y",
            defaultDate: parseDateString(state.startDate),
            onChange: function(selectedDates, dateStr) {
                state.startDate = dateStr;
                persistState();
                fetchStatus = {};
                liveWeatherData = {};
                renderAll();
            }
        });
    } catch (e) { console.error("Flatpickr initialization failed", e); }
}

window.openChartModal = function(index) {
    const day = state.routeDays[index];
    const harbor = state.harbors.find(h => h.id === day.harborId);
    const liveKey = `${index}_${day.harborId}`;
    const data = liveWeatherData[liveKey];

    if (!data || !data.graphData || data.graphData.labels.length === 0) {
        showToast("Ingen time-for-time graf tilgjengelig for denne dagen.", "error");
        return;
    }

    document.getElementById('chart-modal-title').innerText = `Værutvikling: ${harbor.name} (Dag ${index + 1})`;
    document.getElementById('chart-modal').classList.remove('hidden');

    const ctx = document.getElementById('weatherChart').getContext('2d');
    if (weatherChartInstance) weatherChartInstance.destroy();

    weatherChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.graphData.labels,
            datasets: [
                {
                    label: 'Temperatur (°C)',
                    data: data.graphData.temps,
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Vind (m/s)',
                    data: data.graphData.winds,
                    borderColor: '#14b8a6',
                    backgroundColor: '#14b8a6',
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Vindkast (m/s)',
                    data: data.graphData.gusts,
                    borderColor: '#f43f5e',
                    backgroundColor: '#f43f5e',
                    borderDash: [5, 5],
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Nedbør (mm)',
                    data: data.graphData.rains,
                    type: 'bar',
                    backgroundColor: 'rgba(14, 165, 233, 0.5)',
                    borderColor: '#0ea5e9',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            color: '#cbd5e1',
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                y: { 
                    type: 'linear', display: true, position: 'left', 
                    title: { display: true, text: 'Temp / Vind', color: '#cbd5e1' },
                    ticks: { color: '#94a3b8' }, grid: { color: '#334155' } 
                },
                y1: { 
                    type: 'linear', display: true, position: 'right', 
                    title: { display: true, text: 'Nedbør (mm)', color: '#cbd5e1' },
                    grid: { drawOnChartArea: false }, ticks: { color: '#94a3b8' } 
                }
            },
            plugins: { legend: { labels: { color: '#cbd5e1' } } }
        }
    });
}

window.closeChartModal = function() {
    document.getElementById('chart-modal').classList.add('hidden');
}
