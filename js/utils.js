// Utility functions for date formatting, calculations, and UI helpers

function parseDateString(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
        dateStr = dateStr.replace(/["']/g, "").trim();
    } else {
        return new Date();
    }

    if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!isNaN(d.getTime())) return d;
        }
    }
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            if (parts[0].length === 4) { 
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (!isNaN(d.getTime())) return d;
            } else if (parts[2].length === 4) { 
                const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                if (!isNaN(d.getTime())) return d;
            }
        }
    }
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
}

function formatNorwegianDate(dateStr, offset) {
    const d = parseDateString(dateStr);
    d.setDate(d.getDate() + offset);
    const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
    const months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function degToCompass(num) {
    const val = Math.floor((num / 45) + 0.5);
    const arr = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
    return arr[(val % 8)];
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const km = R * c;
    const nm = km / 1.852; 
    return { km, nm };
}

function calculateTravelTime(nm, knots) {
    if (!knots || knots <= 0 || isNaN(knots)) knots = 6;
    const hoursFraction = nm / knots;
    const hours = Math.floor(hoursFraction);
    const minutes = Math.round((hoursFraction - hours) * 60);
    return { hours, minutes };
}

function formatTravelTime(nm, knots) {
    const t = calculateTravelTime(nm, knots);
    if (t.hours === 0) return `~${t.minutes}m`;
    if (t.minutes === 0) return `~${t.hours}t`;
    return `~${t.hours}t ${t.minutes}m`;
}

// Returns estimated liters of fuel for a given leg, assuming engine use the full distance.
function calculateFuelNeeded(nm, boatSpeed, fuelConsumption) {
    if (!boatSpeed || boatSpeed <= 0 || !fuelConsumption || fuelConsumption <= 0) return 0;
    const hours = nm / boatSpeed;
    return hours * fuelConsumption;
}

function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-5 right-5 z-[10000] p-4 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-10 opacity-0 border text-sm font-bold flex items-center gap-2 ${
        type === "error" ? "bg-rose-950/90 text-rose-200 border-rose-500/30" : 
        type === "info" ? "bg-sky-950/90 text-sky-200 border-sky-500/30" : 
        "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
    }`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'info' ? 'fa-spinner animate-spin' : 'fa-circle-check'}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove("translate-y-10", "opacity-0"), 10);
    setTimeout(() => {
        toast.classList.add("translate-y-10", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function getWindArrowHtml(directionStr) {
    if (!directionStr || directionStr === "-") return "";
    const angles = { "N": 180, "NØ": 225, "Ø": 270, "SØ": 315, "S": 0, "SV": 45, "V": 90, "NV": 135 };
    const rotation = angles[directionStr] !== undefined ? angles[directionStr] : 0;
    return `<span class="inline-block transition-transform duration-500" style="transform: rotate(${rotation}deg);" title="Vindretning: ${directionStr}"><i class="fa-solid fa-arrow-up text-teal-400"></i></span>`;
}

function getWeatherIconClass(weather) {
    const sym = weather.symbolCode || "";
    if (sym.includes("rain") || sym.includes("showers")) return "fa-cloud-showers-heavy text-sky-400";
    if (sym.includes("sleet") || sym.includes("snow")) return "fa-snowflake text-teal-300";
    if (sym.includes("cloud") || sym.includes("partlycloudy")) return "fa-cloud-sun text-slate-400";
    if (sym.includes("clearsky") || sym.includes("fair")) return "fa-sun text-amber-400";
    
    if (weather.condition === "Rainy") return "fa-cloud-showers-heavy text-sky-400";
    if (weather.condition === "Cloudy") return "fa-cloud text-slate-400";
    if (weather.condition === "Windy") return "fa-wind text-teal-400";
    return "fa-sun text-amber-400";
}

function generateWeather(harborId, index) {
    return { 
        temp: "-", windSpeed: "-", gusts: "-", condition: "-", rainAmount: "-", windDir: "-", isLive: false 
    };
}

function showResetConfirmation() {
    document.getElementById("reset-modal").classList.remove("hidden");
}

function closeResetModal() {
    document.getElementById("reset-modal").classList.add("hidden");
}
