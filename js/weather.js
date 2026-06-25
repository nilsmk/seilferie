// Weather fetching and processing

async function fetchMETWeather(index, harborId) {
    const key = `${index}_${harborId}`;
    if (fetchStatus[key] === "loading" || fetchStatus[key] === "success") return;

    const day = state.routeDays[index];
    if (!day) return;

    const plannedDate = parseDateString(state.startDate);
    plannedDate.setDate(plannedDate.getDate() + day.dateOffset);

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const plannedDateNoTime = new Date(plannedDate);
    plannedDateNoTime.setHours(0,0,0,0);

    const diffDays = Math.round((plannedDateNoTime - today) / (1000 * 60 * 60 * 24));

    const harbor = state.harbors.find(h => h.id === harborId);
    if (!harbor) return;

    if (diffDays < 0 || diffDays > 21) {
        fetchStatus[key] = "out_of_range";
        return;
    }

    fetchStatus[key] = "loading";

    try {
        if (diffDays <= 2) {
            // 0-2 DAGER: Live MET locationforecast
            const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${harbor.lat.toFixed(4)}&lon=${harbor.lng.toFixed(4)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("MET locationforecast failed");
            
            const data = await response.json();
            const timeseries = data.properties.timeseries;

            const targetDateStr = plannedDate.toISOString().split('T')[0];
            let bestEntry = null;
            let minDiff = Infinity;

            const graphData = { labels: [], temps: [], winds: [], gusts: [], rains: [] };

            timeseries.forEach(entry => {
                if (entry.time.startsWith(targetDateStr)) {
                    const entryHour = new Date(entry.time).getUTCHours();
                    const diff = Math.abs(entryHour - 12);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestEntry = entry;
                    }
                    
                    const d = new Date(entry.time);
                    const timeLabelLocal = d.getHours().toString().padStart(2, '0') + ":00";
                    graphData.labels.push(timeLabelLocal);
                    graphData.temps.push(entry.data.instant.details.air_temperature);
                    graphData.winds.push(entry.data.instant.details.wind_speed);
                    graphData.gusts.push(entry.data.instant.details.wind_gust || parseFloat((entry.data.instant.details.wind_speed * 1.3).toFixed(1)));
                    const nextH = entry.data.next_1_hours || entry.data.next_6_hours;
                    graphData.rains.push(nextH ? (nextH.details.precipitation_amount || 0) : 0);
                }
            });

            if (bestEntry) {
                const details = bestEntry.data.instant.details;
                const next6h = bestEntry.data.next_6_hours || bestEntry.data.next_1_hours;

                const temp = details.air_temperature;
                const windSpeed = details.wind_speed;
                const gusts = details.wind_gust || parseFloat((windSpeed * 1.3).toFixed(1));
                const windDir = degToCompass(details.wind_from_direction);
                const rainAmount = next6h ? (next6h.details.precipitation_amount || 0) : 0;

                let condition = "Sunny";
                const symbolCode = next6h ? next6h.summary.symbol_code : "clearsky";
                if (symbolCode.includes("rain") || symbolCode.includes("showers")) condition = "Rainy";
                else if (symbolCode.includes("cloud") || symbolCode.includes("partlycloudy") || symbolCode.includes("fog")) condition = "Cloudy";

                liveWeatherData[key] = {
                    temp, windSpeed, gusts, condition, rainAmount, windDir, symbolCode, isLive: true, source: "met_live", graphData
                };
                fetchStatus[key] = "success";
            }
        } else if (diffDays > 2 && diffDays <= 14) {
            // 3-14 DAGER: ECMWF Open-Meteo
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${harbor.lat.toFixed(4)}&longitude=${harbor.lng.toFixed(4)}&hourly=temperature_2m,rain,wind_speed_10m,wind_direction_10m,cloud_cover,wind_gusts_10m&models=ecmwf_ifs&wind_speed_unit=ms&forecast_days=16`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Open-Meteo ECMWF failed");

            const data = await response.json();
            
            const targetYear = plannedDate.getFullYear();
            const targetMonth = String(plannedDate.getMonth() + 1).padStart(2, '0');
            const targetDay = String(plannedDate.getDate()).padStart(2, '0');
            const dayPrefix = `${targetYear}-${targetMonth}-${targetDay}`;
            const targetPrefixMidday = `${dayPrefix}T12:00`; 

            const graphData = { labels: [], temps: [], winds: [], gusts: [], rains: [] };
            
            data.hourly.time.forEach((t, i) => {
                if (t.startsWith(dayPrefix)) {
                    graphData.labels.push(t.substring(11, 16));
                    graphData.temps.push(data.hourly.temperature_2m[i]);
                    graphData.winds.push(data.hourly.wind_speed_10m[i]);
                    graphData.gusts.push(data.hourly.wind_gusts_10m[i]);
                    graphData.rains.push(data.hourly.rain[i] || 0);
                }
            });

            let timeIndex = data.hourly.time.findIndex(t => t === targetPrefixMidday);
            if (timeIndex === -1) {
                timeIndex = data.hourly.time.findIndex(t => t.startsWith(dayPrefix));
            }

            if (timeIndex !== -1) {
                const temp = data.hourly.temperature_2m[timeIndex];
                const windSpeed = data.hourly.wind_speed_10m[timeIndex];
                const gusts = data.hourly.wind_gusts_10m[timeIndex];
                const windDir = degToCompass(data.hourly.wind_direction_10m[timeIndex]);
                const rainAmount = data.hourly.rain[timeIndex] || 0;
                const cloudCover = data.hourly.cloud_cover[timeIndex];

                let condition = "Sunny";
                if (rainAmount > 0.5) condition = "Rainy";
                else if (cloudCover > 50) condition = "Cloudy";

                liveWeatherData[key] = {
                    temp, windSpeed, gusts, condition, rainAmount, windDir, symbolCode: condition === "Rainy" ? "rain" : "clearsky", isLive: true, source: "ecmwf", graphData
                };
                fetchStatus[key] = "success";
            } else {
                 fetchStatus[key] = "no_data";
            }

        } else if (diffDays > 14 && diffDays <= 21) {
            // 15-21 DAGER: MET Subseasonal
            const url = `https://api.met.no/weatherapi/subseasonal/1.0/complete?lat=${harbor.lat.toFixed(4)}&lon=${harbor.lng.toFixed(4)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("MET subseasonal failed");

            const data = await response.json();
            const timeseries = data.properties.timeseries;

            const targetYear = plannedDate.getFullYear();
            const targetMonth = plannedDate.getMonth();
            const targetDay = plannedDate.getDate();

            let matchedEntry = timeseries.find(entry => {
                const entryDate = new Date(entry.time);
                return entryDate.getFullYear() === targetYear &&
                       entryDate.getMonth() === targetMonth &&
                       entryDate.getDate() === targetDay;
            });

            if (matchedEntry) {
                let temp = "-";
                let rainAmount = 0;

                if (matchedEntry.data && matchedEntry.data.next_24_hours && matchedEntry.data.next_24_hours.details) {
                    const details = matchedEntry.data.next_24_hours.details;
                    if (typeof details.air_temperature_mean === 'number') {
                        temp = details.air_temperature_mean;
                    } else if (typeof details.air_temperature_max === 'number') {
                        temp = details.air_temperature_max;
                    }
                    if (typeof details.precipitation_amount === 'number') {
                        rainAmount = details.precipitation_amount;
                    }
                } else if (matchedEntry.data && matchedEntry.data.instant && matchedEntry.data.instant.details) {
                    const details = matchedEntry.data.instant.details;
                    temp = details.air_temperature_mean ?? details.air_temperature ?? "-";
                    rainAmount = details.precipitation_amount ?? 0;
                }

                const condition = rainAmount > 2 ? "Rainy" : "Sunny";

                liveWeatherData[key] = {
                    temp, 
                    windSpeed: "-", 
                    gusts: "-", 
                    condition, 
                    rainAmount, 
                    windDir: "-", 
                    symbolCode: condition === "Rainy" ? "rain" : "clearsky", 
                    isLive: true, 
                    source: "met_subseasonal"
                };
                fetchStatus[key] = "success";
            } else {
                fetchStatus[key] = "no_data";
            }
        }
    } catch (err) {
        console.error("MET/ECMWF error:", err);
        fetchStatus[key] = "error";
    }

    renderAll();
}
