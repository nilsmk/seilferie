// ECMWF IFS025 Ensemble Weather – Open-Meteo API integration
// Fetches 16-day ensemble forecasts (50 members + control) for each harbor.

const ENSEMBLE_VARS = {
    temperature_2m: {
        label: 'Temperatur',
        unit: '°C',
        color: '#f97316',
        yAxis: 'yLeft',
        defaultOn: true
    },
    wind_speed_10m: {
        label: 'Vind',
        unit: 'm/s',
        color: '#38bdf8',
        yAxis: 'yRight',
        defaultOn: true
    },
    wind_gusts_10m: {
        label: 'Vindkast',
        unit: 'm/s',
        color: '#7dd3fc',
        yAxis: 'yRight',
        defaultOn: true
    },
    pressure_msl: {
        label: 'Trykk',
        unit: 'hPa',
        color: '#a78bfa',
        yAxis: 'yPressure',
        defaultOn: false
    },
    cloud_cover: {
        label: 'Skydekke',
        unit: '%',
        color: '#94a3b8',
        yAxis: 'yCloud',
        defaultOn: false
    },
    rain: {
        label: 'Nedbør',
        unit: 'mm',
        color: '#60a5fa',
        yAxis: 'yRain',
        defaultOn: false
    }
};

// Per-harbor state
const ensembleState = {
    data: {},       // harborId -> raw API response
    processed: {},  // harborId -> { times6h, vars: { varName -> { mean, p10, p25, p75, p90 } } }
    activeVars: {}, // harborId -> Set<varName>
    charts: {},     // harborId -> Chart instance
    loading: {},    // harborId -> bool
    errors: {}      // harborId -> string
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function initActiveVars(harborId) {
    if (!ensembleState.activeVars[harborId]) {
        ensembleState.activeVars[harborId] = new Set(
            Object.entries(ENSEMBLE_VARS)
                .filter(([, cfg]) => cfg.defaultOn)
                .map(([key]) => key)
        );
    }
}

function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return null;
    const idx = (p / 100) * (sortedArr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function roundTo(val, decimals) {
    if (val === null || val === undefined) return null;
    return +val.toFixed(decimals);
}

// ─── Data Fetching & Processing ─────────────────────────────────────────────

async function fetchEnsembleData(harbor) {
    if (ensembleState.loading[harbor.id] || ensembleState.processed[harbor.id]) return;

    ensembleState.loading[harbor.id] = true;
    updateHarborPanelStatus(harbor.id, 'loading');

    const varList = Object.keys(ENSEMBLE_VARS).join(',');
    const url = [
        'https://ensemble-api.open-meteo.com/v1/ensemble',
        `?latitude=${harbor.lat}`,
        `&longitude=${harbor.lng}`,
        `&hourly=${varList}`,
        '&models=ecmwf_ifs025_ensemble',
        '&forecast_days=16',
        '&wind_speed_unit=ms'
    ].join('');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        ensembleState.data[harbor.id] = raw;
        ensembleState.processed[harbor.id] = processEnsembleData(raw);
        ensembleState.loading[harbor.id] = false;

        renderHarborChart(harbor);
        updateHarborPanelStatus(harbor.id, 'ready');
    } catch (err) {
        ensembleState.loading[harbor.id] = false;
        ensembleState.errors[harbor.id] = err.message;
        updateHarborPanelStatus(harbor.id, 'error', err.message);
        console.error(`Ensemble fetch failed for ${harbor.name}:`, err);
    }
}

/**
 * Reduce hourly ensemble data to 6-hourly steps, computing ensemble statistics.
 * Returns { times6h: string[], vars: { [varName]: { mean, p10, p25, p75, p90, min, max }[] } }
 */
function processEnsembleData(raw) {
    const hourly = raw.hourly;
    const allTimes = hourly.time; // ISO8601 strings
    const result = { times6h: [], vars: {} };

    // Sample every 6 hours
    const STEP = 6;
    for (let i = 0; i < allTimes.length; i += STEP) {
        result.times6h.push(allTimes[i]);
    }

    for (const varName of Object.keys(ENSEMBLE_VARS)) {
        // Collect all member arrays (base + member01..member50)
        const memberArrays = [];
        if (Array.isArray(hourly[varName])) memberArrays.push(hourly[varName]);
        for (let m = 1; m <= 50; m++) {
            const key = `${varName}_member${String(m).padStart(2, '0')}`;
            if (Array.isArray(hourly[key])) memberArrays.push(hourly[key]);
        }
        if (memberArrays.length === 0) continue;

        const stats = { mean: [], p10: [], p25: [], p75: [], p90: [], min: [], max: [] };

        for (let i = 0; i < allTimes.length; i += STEP) {
            const vals = memberArrays
                .map(arr => arr[i])
                .filter(v => v !== null && v !== undefined && !isNaN(v));

            if (vals.length === 0) {
                ['mean', 'p10', 'p25', 'p75', 'p90', 'min', 'max'].forEach(k => stats[k].push(null));
                continue;
            }

            vals.sort((a, b) => a - b);
            const n = vals.length;
            const mean = vals.reduce((s, v) => s + v, 0) / n;

            stats.mean.push(roundTo(mean, 2));
            stats.p10.push(roundTo(percentile(vals, 10), 2));
            stats.p25.push(roundTo(percentile(vals, 25), 2));
            stats.p75.push(roundTo(percentile(vals, 75), 2));
            stats.p90.push(roundTo(percentile(vals, 90), 2));
            stats.min.push(roundTo(vals[0], 2));
            stats.max.push(roundTo(vals[n - 1], 2));
        }

        result.vars[varName] = stats;
    }

    return result;
}

// ─── Chart Rendering ─────────────────────────────────────────────────────────

function buildEnsembleDatasets(harborId, processed, activeVars) {
    const datasets = [];

    for (const [varName, cfg] of Object.entries(ENSEMBLE_VARS)) {
        if (!activeVars.has(varName)) continue;
        const stats = processed.vars[varName];
        if (!stats) continue;

        const hex = cfg.color;
        // Convert hex to rgba for fill areas
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const bandFill = `rgba(${r},${g},${b},0.15)`;
        const wideFill = `rgba(${r},${g},${b},0.07)`;

        // P90 (upper boundary, fills down to P10 via fill:'+2')
        datasets.push({
            label: `_${varName}_p90`,
            data: stats.p90,
            borderColor: 'transparent',
            backgroundColor: bandFill,
            fill: '+2',           // fill to P10 (index +2 datasets away)
            tension: 0.4,
            pointRadius: 0,
            yAxisID: cfg.yAxis,
            order: 3,
            _var: varName
        });

        // P25 (inner upper, fills to P75 via fill:'+1')
        datasets.push({
            label: `_${varName}_p25`,
            data: stats.p25,
            borderColor: 'transparent',
            backgroundColor: wideFill,
            fill: '+1',           // fill to P75
            tension: 0.4,
            pointRadius: 0,
            yAxisID: cfg.yAxis,
            order: 2,
            _var: varName
        });

        // P75 (inner lower boundary)
        datasets.push({
            label: `_${varName}_p75`,
            data: stats.p75,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            yAxisID: cfg.yAxis,
            order: 2,
            _var: varName
        });

        // P10 (outer lower boundary)
        datasets.push({
            label: `_${varName}_p10`,
            data: stats.p10,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            yAxisID: cfg.yAxis,
            order: 3,
            _var: varName
        });

        // Mean line (the visible, labelled dataset)
        datasets.push({
            label: `${cfg.label} (${cfg.unit})`,
            data: stats.mean,
            borderColor: hex,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: cfg.yAxis,
            order: 1,
            _var: varName
        });
    }

    return datasets;
}

function buildScales(activeVars) {
    const inLeft = v => ENSEMBLE_VARS[v]?.yAxis === 'yLeft';
    const inRight = v => ENSEMBLE_VARS[v]?.yAxis === 'yRight';
    const inPressure = v => ENSEMBLE_VARS[v]?.yAxis === 'yPressure';
    const inCloud = v => ENSEMBLE_VARS[v]?.yAxis === 'yCloud';
    const inRain = v => ENSEMBLE_VARS[v]?.yAxis === 'yRain';

    const showLeft = [...activeVars].some(inLeft);
    const showRight = [...activeVars].some(inRight);
    const showPressure = [...activeVars].some(inPressure);
    const showCloud = [...activeVars].some(inCloud);
    const showRain = [...activeVars].some(inRain);

    const leftLabel = [...activeVars].filter(inLeft)
        .map(v => `${ENSEMBLE_VARS[v].label} (${ENSEMBLE_VARS[v].unit})`).join(' / ');
    const rightLabel = [...activeVars].filter(inRight)
        .map(v => `${ENSEMBLE_VARS[v].label} (${ENSEMBLE_VARS[v].unit})`).join(' / ');

    const axisBase = (position, color, label, drawGrid) => ({
        position,
        ticks: { color, font: { size: 10 } },
        grid: { color: drawGrid ? '#1e293b' : 'transparent', drawBorder: false },
        border: { color: '#334155' },
        title: { display: !!label, text: label, color, font: { size: 10 } }
    });

    return {
        x: {
            ticks: {
                color: '#64748b',
                maxRotation: 45,
                maxTicksLimit: 20,
                font: { size: 10 },
                callback(val, idx) {
                    // Show only every 4th label (every 24h at 6h step)
                    if (idx % 4 !== 0) return '';
                    const d = new Date(this.getLabelForValue(val));
                    return d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
                }
            },
            grid: { color: '#1e293b', drawBorder: false }
        },
        yLeft: {
            display: showLeft,
            ...axisBase('left', '#94a3b8', leftLabel, true)
        },
        yRight: {
            display: showRight,
            ...axisBase('right', '#38bdf8', rightLabel, false)
        },
        yPressure: {
            display: showPressure,
            ...axisBase('right', '#a78bfa', showPressure ? 'Trykk (hPa)' : '', false)
        },
        yCloud: {
            display: showCloud,
            ...axisBase('left', '#94a3b8', showCloud ? 'Skydekke (%)' : '', showLeft ? false : true),
            min: 0,
            max: 100
        },
        yRain: {
            display: showRain,
            ...axisBase('right', '#60a5fa', showRain ? 'Nedbør (mm)' : '', false),
            min: 0
        }
    };
}

function renderHarborChart(harbor) {
    const processed = ensembleState.processed[harbor.id];
    if (!processed) return;

    const activeVars = ensembleState.activeVars[harbor.id];
    const canvas = document.getElementById(`ensemble-chart-${harbor.id}`);
    if (!canvas) return;

    // Destroy previous instance
    if (ensembleState.charts[harbor.id]) {
        ensembleState.charts[harbor.id].destroy();
        ensembleState.charts[harbor.id] = null;
    }

    const datasets = buildEnsembleDatasets(harbor.id, processed, activeVars);
    const scales = buildScales(activeVars);

    ensembleState.charts[harbor.id] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: processed.times6h,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'start',
                    labels: {
                        color: '#cbd5e1',
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 12,
                        padding: 12,
                        // Hide internal band datasets from legend
                        filter: item => !item.text.startsWith('_')
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    padding: 10,
                    callbacks: {
                        title(items) {
                            if (!items.length) return '';
                            const d = new Date(items[0].label);
                            return d.toLocaleString('nb-NO', {
                                weekday: 'short', day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit'
                            });
                        },
                        label(ctx) {
                            if (ctx.dataset.label.startsWith('_')) return null;
                            const v = ctx.parsed.y;
                            if (v === null) return null;
                            // Find p10/p90 for this var from processed
                            const varName = ctx.dataset._var;
                            const stats = varName && processed.vars[varName];
                            if (stats) {
                                const i = ctx.dataIndex;
                                const lo = stats.p10[i] !== null ? stats.p10[i].toFixed(1) : '?';
                                const hi = stats.p90[i] !== null ? stats.p90[i].toFixed(1) : '?';
                                return ` ${ctx.dataset.label}: ${v.toFixed(1)}  [P10–P90: ${lo}–${hi}]`;
                            }
                            return ` ${ctx.dataset.label}: ${v.toFixed(1)}`;
                        },
                        filter: item => !item.dataset.label.startsWith('_')
                    }
                }
            },
            scales
        }
    });
}

// ─── Panel Status ────────────────────────────────────────────────────────────

function updateHarborPanelStatus(harborId, status, message) {
    const statusEl = document.getElementById(`ensemble-status-${harborId}`);
    const chartWrap = document.getElementById(`ensemble-chart-wrap-${harborId}`);

    if (!statusEl) return;

    if (status === 'loading') {
        statusEl.innerHTML = `
            <div class="flex items-center gap-2 text-marine-400 text-xs py-8 justify-center">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Henter ensembleprognose fra Open-Meteo...</span>
            </div>`;
        statusEl.classList.remove('hidden');
        if (chartWrap) chartWrap.classList.add('hidden');
    } else if (status === 'ready') {
        statusEl.classList.add('hidden');
        if (chartWrap) chartWrap.classList.remove('hidden');
    } else if (status === 'error') {
        statusEl.innerHTML = `
            <div class="flex items-center gap-2 text-rose-400 text-xs py-6 justify-center">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>Kunne ikke hente data: ${message || 'Ukjent feil'}</span>
                <button onclick="retryEnsembleFetch('${harborId}')"
                    class="ml-2 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-bold border border-rose-500/30">
                    Prøv igjen
                </button>
            </div>`;
        statusEl.classList.remove('hidden');
    }
}

// Retry after error
function retryEnsembleFetch(harborId) {
    delete ensembleState.loading[harborId];
    delete ensembleState.errors[harborId];
    const harbor = state.harbors.find(h => h.id === harborId);
    if (harbor) fetchEnsembleData(harbor);
}

// ─── Variable Toggle ─────────────────────────────────────────────────────────

function toggleEnsembleVar(harborId, varName) {
    initActiveVars(harborId);
    const active = ensembleState.activeVars[harborId];

    if (active.has(varName)) {
        active.delete(varName);
    } else {
        active.add(varName);
    }

    // Update button appearance
    updateToggleButton(harborId, varName);

    // Re-render chart if data is available
    const harbor = state.harbors.find(h => h.id === harborId);
    if (harbor && ensembleState.processed[harborId]) {
        renderHarborChart(harbor);
    }
}

function updateToggleButton(harborId, varName) {
    const btn = document.getElementById(`etoggle-${harborId}-${varName}`);
    if (!btn) return;
    const cfg = ENSEMBLE_VARS[varName];
    const isActive = ensembleState.activeVars[harborId]?.has(varName);

    if (isActive) {
        btn.style.cssText = `border-color:${cfg.color};color:${cfg.color};background-color:${cfg.color}22;`;
    } else {
        btn.style.cssText = 'border-color:#334155;color:#475569;background-color:transparent;';
    }
}

// ─── Tab Rendering ───────────────────────────────────────────────────────────

function renderEnsembleWeatherTab() {
    const container = document.getElementById('ensemble-weather-container');
    if (!container) return;

    // Build all panels
    container.innerHTML = state.harbors.map(harbor => {
        initActiveVars(harbor.id);
        const active = ensembleState.activeVars[harbor.id];

        const toggleBtns = Object.entries(ENSEMBLE_VARS).map(([varName, cfg]) => {
            const isActive = active.has(varName);
            const style = isActive
                ? `border-color:${cfg.color};color:${cfg.color};background-color:${cfg.color}22;`
                : 'border-color:#334155;color:#475569;background-color:transparent;';
            return `<button
                id="etoggle-${harbor.id}-${varName}"
                onclick="toggleEnsembleVar('${harbor.id}','${varName}')"
                style="${style}"
                class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-150 cursor-pointer whitespace-nowrap"
                title="${cfg.label} (${cfg.unit})">${cfg.label}</button>`;
        }).join('');

        const hasData = !!ensembleState.processed[harbor.id];
        const hasError = !!ensembleState.errors[harbor.id];

        return `
        <div class="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <!-- Panel header -->
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                    <h3 class="font-bold text-base text-white flex items-center gap-2">
                        <i class="fa-solid fa-anchor text-teal-400 text-sm"></i>
                        ${harbor.name}
                    </h3>
                    <p class="text-[10px] text-slate-500 mt-0.5">
                        ${harbor.lat.toFixed(4)}°N, ${harbor.lng.toFixed(4)}°Ø
                        &bull; ECMWF IFS025 Ensemble &bull; 16 dager
                    </p>
                </div>
                <!-- Variable toggles -->
                <div class="flex flex-wrap gap-1.5">
                    ${toggleBtns}
                </div>
            </div>

            <!-- Loading / error status -->
            <div id="ensemble-status-${harbor.id}" class="${hasData ? 'hidden' : ''}">
                ${hasError
                    ? `<div class="flex items-center gap-2 text-rose-400 text-xs py-6 justify-center">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span>Kunne ikke hente data: ${ensembleState.errors[harbor.id]}</span>
                            <button onclick="retryEnsembleFetch('${harbor.id}')"
                                class="ml-2 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-bold border border-rose-500/30">
                                Prøv igjen
                            </button>
                        </div>`
                    : `<div class="flex items-center gap-2 text-marine-400 text-xs py-8 justify-center">
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <span>Henter ensembleprognose fra Open-Meteo...</span>
                        </div>`
                }
            </div>

            <!-- Chart container -->
            <div id="ensemble-chart-wrap-${harbor.id}" class="${hasData ? '' : 'hidden'}" style="height:260px;position:relative;">
                <canvas id="ensemble-chart-${harbor.id}"></canvas>
            </div>

            <!-- Band legend -->
            <p class="text-[10px] text-slate-600 flex items-center gap-1.5">
                <i class="fa-solid fa-chart-area"></i>
                Skyggefelt: P25–P75 (mørkt) og P10–P90 (lyst) ensemblespredning. Linje = gjennomsnitt.
            </p>
        </div>`;
    }).join('');

    // Re-render charts for harbors that already have data, fetch the rest
    state.harbors.forEach(harbor => {
        if (ensembleState.processed[harbor.id]) {
            renderHarborChart(harbor);
        } else if (!ensembleState.loading[harbor.id]) {
            fetchEnsembleData(harbor);
        }
    });
}
