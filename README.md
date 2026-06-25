# ⛵ Seilferie 2026 – Sailing Itinerary Planner

A comprehensive, interactive web-based sailing trip planner for the Oslo Fjord and surrounding Scandinavian waters. Plan your sailing route, track weather forecasts, manage meals, and generate printable itineraries—all offline-capable.

## 🎯 Features

- **Interactive Route Planning**: Add sailing days, select harbors, and visualize your route on an interactive Leaflet map
- **Live Weather Integration**: 
  - Real-time MET.no forecasts (0-2 days)
  - ECMWF extended forecasts (3-14 days)
  - MET subseasonal forecasts (15-21 days)
  - Interactive weather graphs with hourly breakdowns
- **Ensemble Weather Page** *(new — devel)*:
  - Dedicated tab showing 16-day ECMWF IFS025 ensemble forecasts for **every harbor** in the database
  - Powered by [Open-Meteo Ensemble API](https://open-meteo.com/en/docs/ensemble-api) (free, no API key required)
  - 50 ensemble members + control run → ensemble mean with P10/P25/P75/P90 spread bands
  - Per-harbor variable toggles: Temperature, Wind speed, Wind gusts, Pressure, Cloud cover, Rain
  - Multiple Y-axes (temperature/cloud/rain on left; wind on right; pressure on its own axis)
  - Tooltips show mean value plus P10–P90 uncertainty range
- **Meal Management**: Curate custom dinner plans with a reusable database
- **Harbor Database**: 18+ pre-loaded harbors with coordinates, weather links, webcam URLs, and harbor guide references
- **Route Variants**: Save and load multiple route alternatives
- **Print & Export**: Generate PDF-ready summaries or export your entire plan as JSON for offline access
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline-First**: Store everything in browser localStorage; export/import for portability

---

## 📁 Project Structure

```
seilferie/
├── index.html                    # Main entry point (simplified, ~250 lines)
├── README.md                     # This file
├── css/
│   ├── theme.css                 # Leaflet & Flatpickr theming
│   └── print.css                 # Print-friendly styles
└── js/
    ├── state.js                  # Global state, persistence, route/harbor/dinner management
    ├── utils.js                  # Utility functions (date formatting, calculations, toasts)
    ├── weather.js                # MET/ECMWF/subseasonal API fetching (route planner cards)
    ├── ensemble_weather.js       # ECMWF IFS025 ensemble tab – Open-Meteo API, Chart.js rendering
    ├── maps.js                   # Leaflet map initialization and rendering
    └── ui.js                     # DOM rendering, tab switching, UI updates
```

---

## 🚀 Getting Started

### Opening the App

1. **Clone/Download** this repository to your local machine
2. **Open `index.html`** directly in a modern web browser (Chrome, Firefox, Safari, Edge)
   - No server required! Everything runs in your browser
3. The app loads with a default 4-day route. Customize as needed

### Key Workflows

#### Plan a Route
1. Set your **start date** using the date picker
2. Adjust **boat speed** (knots) for accurate travel time estimates
3. Click **"Legg til dag"** to add sailing days
4. Select harbors for each day from the dropdown
5. View the route on the interactive map (left panel)

#### Check Weather
- Weather forecasts are automatically fetched based on the planned date
- Green badge = Live MET data (0-2 days)
- Purple badge = ECMWF model (3-14 days)
- Blue badge = Subseasonal forecast (15-21 days)
- Hover over temp/wind icons to see details
- Click **"Vis graf"** for hourly breakdowns (temp, wind gusts, rainfall)

#### Manage Meals
1. Go to the **"Middagsmeny"** tab
2. Add new dinner ideas or remove unused ones
3. Assign meals to each sailing day in the route planner
4. Meals are searchable and reusable

#### Harbor Management
1. Go to the **"Havneguide"** tab
2. **Click the map** to auto-populate latitude/longitude
3. Fill in harbor details (name, guide name, weather/webcam URLs)
4. **Click "Lagre havn"** to add a custom harbor
5. Edit or delete harbors from the archive table

#### Save & Export Routes
- **Save route variant**: Enter a name and click "Lagre" under "Lagrede ruter"
- **Load variant**: Click "Åpne" on any saved route
- **Export all data**: Click "Eksporter alt" to download a JSON file
- **Import data**: Click "Importer alt" to restore from a backup file

#### Generate Itinerary
1. Go to the **"Sammendrag"** tab
2. Review the complete route summary with weather forecasts
3. Click **"Skriv ut reiserute"** to generate a PDF-friendly view
4. Print or save as PDF from your browser

#### Ensemble Weather Forecasts
1. Go to the **"Ensemble"** tab
2. The app fetches 16-day ECMWF IFS025 ensemble data for all harbors automatically
3. Each harbor panel shows an interactive Chart.js chart with ensemble spread:
   - **Shaded bands**: outer (lighter) = P10–P90, inner (darker) = P25–P75 uncertainty
   - **Solid line**: ensemble mean
4. Use the **variable toggle buttons** at the top of each panel to show/hide:
   - `Temperatur` (°C) – left axis
   - `Vind` + `Vindkast` (m/s) – right axis
   - `Trykk` (hPa) – separate right axis
   - `Skydekke` (%) – left axis
   - `Nedbør` (mm) – right axis
5. Hover over the chart to see the exact mean and P10–P90 range in the tooltip
6. If a fetch fails, click **"Prøv igjen"** in the panel

---

## 🛠️ Development Guide

### Architecture

The app is split into 5 focused JavaScript modules:

| Module | Purpose | Key Functions |
|--------|---------|---|
| **state.js** | Data management & persistence | `state` object, `loadSavedState()`, `persistState()`, CRUD for routes/harbors/dinners |
| **utils.js** | Helper functions | `formatNorwegianDate()`, `calculateDistance()`, `showToast()`, `parseDateString()` |
| **weather.js** | Route-card weather API | `fetchMETWeather()` for live/ECMWF/subseasonal forecasts |
| **ensemble_weather.js** | Ensemble weather tab | `fetchEnsembleData()`, `processEnsembleData()`, `renderHarborChart()`, `toggleEnsembleVar()`, `renderEnsembleWeatherTab()` |
| **maps.js** | Map rendering | `initializeMap()`, `drawMapRoute()`, `drawDatabaseMapRoutes()`, Leaflet markers/polylines |
| **ui.js** | DOM updates & interaction | `renderAll()`, `switchTab()`, chart modals, form bindings |

### Adding a New Feature

**Example: Add a fuel consumption calculator**

1. **Add state variables** in `state.js`:
   ```javascript
   // Add to state object
   fuelConsumption: 5.0, // liters/hour
   ```

2. **Create utility function** in `utils.js`:
   ```javascript
   function calculateFuelNeeded(nm, boatSpeed, fuelConsumption) {
       const hours = (nm / boatSpeed);
       return hours * fuelConsumption;
   }
   ```

3. **Update UI** in `ui.js`:
   ```javascript
   // Add to renderAll() where stats are displayed
   const totalFuel = state.routeDays.reduce((fuel, day, i) => {
       return fuel + calculateFuelNeeded(calculatedDistances[i].nm, state.boatSpeed, state.fuelConsumption);
   }, 0);
   document.getElementById("stat-fuel").innerText = totalFuel.toFixed(1) + " L";
   ```

4. **Persist data** in `state.js`:
   ```javascript
   // Add to persistState()
   safeLocalStorageSet("seil_fuelConsumption", state.fuelConsumption);
   // Add to loadSavedState()
   state.fuelConsumption = parseFloat(localStorage.getItem("seil_fuelConsumption")) || 5.0;
   ```

### Modifying Styles

- **Tailwind CSS**: Already configured via CDN in `index.html`
- **Custom CSS**: Edit `css/theme.css` (Leaflet, Flatpickr overrides) or `css/print.css` (printing)
- **Color scheme**: Defined in `index.html` under `tailwind.config` (marine, teal palette)

### Testing Weather Fetching

Weather data is cached in `liveWeatherData` object. To debug:

1. Open browser **DevTools** (F12)
2. Check the **Console** for fetch errors
3. Inspect `liveWeatherData` in the console:
   ```javascript
   console.log(liveWeatherData)
   ```

### Offline Mode

The app works entirely offline once loaded:
- **Export your plan**: Click "Eksporter alt" before going on the trip
- **Transfer file**: Move the JSON file to your phone/tablet
- **Import on boat**: Use "Importer alt" without internet

---

## 📊 Data Schemas

### Route Day Object
```javascript
{
  dateOffset: 0,           // Days from start date
  harborId: "saetre",      // Reference to harbor in harbors array
  dinner: "Pasta bolognese",
  customNotes: "Fuel check",
  customWeather: null,     // {temp, windSpeed, gusts, rainAmount, windDir} or null
  booked: false            // Locks the day from deletion
}
```

### Harbor Object
```javascript
{
  id: "saetre",            // Unique identifier
  name: "Sætre",
  lat: 59.6806,
  lng: 10.5186,
  guideName: "Sætre Havn",
  guideUrl: "https://...",
  webcamUrl: "https://...",
  yrUrl: "https://www.yr.no/..."
}
```

### Saved Route Object
```javascript
{
  id: "1234567890",        // Timestamp
  name: "Main Route",
  startDate: "24/07/2026",
  boatSpeed: 6.0,
  routeDays: [...],        // Array of route day objects
  dinners: [...]           // Custom dinner list
}
```

---

## 🌐 External Dependencies

### CDN Libraries
- **Tailwind CSS**: Styling framework
- **FontAwesome 6.4**: Icons
- **Leaflet 1.9.4**: Interactive maps
- **Flatpickr**: Date picker
- **Chart.js**: Weather graphs
- **Google Fonts**: Inter & Playfair Display fonts

### APIs
- **MET.no**: Norwegian Meteorological Institute (free, no key required)
- **Open-Meteo**: ECMWF forecasts (free, no key required)
- **OpenStreetMap/CartoDB**: Map tiles (free)

All libraries are loaded from public CDNs. No API keys are needed.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Weather not updating | Check browser console for CORS errors; MET API may have temporary outages |
| Map not showing | Ensure Leaflet library loaded (check Network tab in DevTools) |
| Data not saving | Check localStorage quota (usually 5-10MB per domain) |
| Date picker not working | Verify Flatpickr and locale (no.js) scripts are loaded |
| Poor route display | Zoom/pan the map; check that harbor coordinates are valid |

---

## 📝 Browser Support

- **Chrome/Edge**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Mobile browsers**: iOS Safari 14+, Android Chrome 90+

---

## 🔒 Privacy & Data

- **All data is stored locally** in your browser's localStorage
- **No data is sent to external servers** except:
  - Weather API calls to MET.no and Open-Meteo (reads only)
  - Map tiles from OpenStreetMap/CartoDB
- **Export your data** regularly as JSON backups for security

---

## 📄 License

This project is provided as-is for personal sailing trip planning. Modify and distribute freely for non-commercial use.

---

## 🤝 Contributing

Suggestions for improvements?

1. **Test thoroughly** before proposing changes
2. **Document** any new state variables or functions
3. **Keep modules focused** (don't add 500 lines to one file)
4. **Maintain backwards compatibility** with existing localStorage data
5. **Update this README** if you change the structure

---

## 🎓 Learning Resources

- **Leaflet Documentation**: https://leafletjs.com/
- **MET Weather API**: https://www.met.no/en/weather-and-climate/open-data
- **Open-Meteo API**: https://open-meteo.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Flatpickr**: https://flatpickr.js.org/

---

**Happy sailing! ⛵**
