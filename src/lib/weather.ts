export type Place = { name: string; country?: string; lat: number; lon: number };

export type WeatherUnit = "metric" | "imperial";

export type Weather = {
  place: Place;
  fetchedAt: number;
  unit: WeatherUnit;
  current: {
    temp: number;
    code: number;
    wind: number;
    feels: number;
    humidity: number;
    uvIndex: number;
    precipitation: number;
    aqi?: number | undefined;
    is_day?: number;
  };
  sun: {
    sunrise: string;
    sunset: string;
  };
  hourly: {
    time: string;
    temp: number;
    code: number;
    precipProb: number;
    is_day?: number;
  }[];
  daily: {
    date: string;
    max: number;
    min: number;
    code: number;
    precipProbMax: number;
  }[];
};

const CACHE_KEY = "weather:last";
const UNIT_KEY = "weather:unit-pref";
const FAVORITES_KEY = "weather:favorites";

export function loadUnitPref(): WeatherUnit {
  try {
    const saved = localStorage.getItem(UNIT_KEY);
    return saved === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveUnitPref(unit: WeatherUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {}
}

export function loadFavorites(): Place[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Place[]) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: Place[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

export function isSamePlace(a: Place, b: Place): boolean {
  return (
    (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01) ||
    a.name === b.name
  );
}

export function isFavorite(place: Place, favorites: Place[]): boolean {
  return favorites.some((f) => isSamePlace(f, place));
}

export function loadCached(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Weather) : null;
  } catch {
    return null;
  }
}

export async function searchCity(q: string): Promise<Place[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&format=json`,
  );
  if (!r.ok) throw new Error("Search failed");
  const j = await r.json();
  return (j.results ?? []).map((x: any) => ({
    name: x.admin1 && x.admin1 !== x.name ? `${x.name}, ${x.admin1}` : x.name,
    country: x.country,
    lat: x.latitude,
    lon: x.longitude,
  }));
}

export async function fetchWeather(place: Place, unit: WeatherUnit = "metric"): Promise<Weather> {
  const tempUnit = unit === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = unit === "imperial" ? "mph" : "kmh";
  const precipUnit = unit === "imperial" ? "inch" : "mm";

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,uv_index,precipitation,is_day` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
    `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}` +
    `&timezone=auto&forecast_days=7`;

  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}&current=us_aqi`;

  const [weatherRes, aqiRes] = await Promise.allSettled([
    fetch(weatherUrl).then((r) => {
      if (!r.ok) throw new Error("Weather request failed");
      return r.json();
    }),
    fetch(aqiUrl).then((r) => (r.ok ? r.json() : null)),
  ]);

  if (weatherRes.status === "rejected") {
    throw new Error("Weather request failed");
  }

  const j = weatherRes.value;
  let aqi: number | undefined;
  if (aqiRes.status === "fulfilled" && aqiRes.value?.current?.us_aqi !== undefined) {
    aqi = Math.round(aqiRes.value.current.us_aqi);
  }

  // Anchor live hourly forecast to the current hour and roll forward 24 consecutive hours
  const currentHourIso = j.current?.time ? j.current.time.slice(0, 13) + ":00" : "";
  let startIdx = j.hourly?.time?.findIndex((t: string) => t >= currentHourIso) ?? 0;
  if (startIdx === -1) startIdx = 0;

  const totalHours = j.hourly?.time?.length ?? 0;
  const count = Math.min(24, Math.max(0, totalHours - startIdx));
  const hourly = [];

  for (let idx = 0; idx < count; idx++) {
    const dataIdx = startIdx + idx;
    hourly.push({
      time: j.hourly.time[dataIdx],
      temp: idx === 0 && j.current?.temperature_2m !== undefined ? j.current.temperature_2m : j.hourly.temperature_2m[dataIdx],
      code: idx === 0 && j.current?.weather_code !== undefined ? j.current.weather_code : j.hourly.weather_code[dataIdx],
      precipProb: j.hourly.precipitation_probability?.[dataIdx] ?? 0,
      is_day: idx === 0 && j.current?.is_day !== undefined ? j.current.is_day : (j.hourly.is_day?.[dataIdx] ?? 1),
    });
  }

  const formatSunTime = (iso?: string) => (iso ? iso.slice(11, 16) : "--:--");
  const sunrise = formatSunTime(j.daily.sunrise?.[0]);
  const sunset = formatSunTime(j.daily.sunset?.[0]);

  const w: Weather = {
    place,
    fetchedAt: Date.now(),
    unit,
    current: {
      temp: j.current.temperature_2m,
      feels: j.current.apparent_temperature,
      code: j.current.weather_code,
      wind: j.current.wind_speed_10m,
      humidity: j.current.relative_humidity_2m ?? 0,
      uvIndex: Math.round(j.current.uv_index ?? 0),
      precipitation: j.current.precipitation ?? 0,
      aqi,
      is_day: j.current.is_day,
    },
    sun: { sunrise, sunset },
    hourly,
    daily: j.daily.time.map((d: string, i: number) => ({
      date: d,
      max: j.daily.temperature_2m_max[i],
      min: j.daily.temperature_2m_min[i],
      code: j.daily.weather_code[i],
      precipProbMax: j.daily.precipitation_probability_max?.[i] ?? 0,
    })),
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(w));
  } catch {}

  return w;
}

// Alias export for backwards compatibility
export const getWeather = fetchWeather;

export function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  return { label: "Thunderstorm", icon: "⛈️" };
}

export function uvCategory(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function aqiCategory(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "text-emerald-500" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-500" };
  if (aqi <= 150) return { label: "Sensitive", color: "text-orange-500" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-500" };
  return { label: "Very Unhealthy", color: "text-purple-500" };
}

export function skyKey(code: number, isDay: number | undefined): string {
  const day = isDay !== 0;
  if (code <= 2) return day ? "clear-day" : "clear-night";
  if (code === 3) return day ? "cloudy-day" : "cloudy-night";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "storm";
}

export function getWeatherAlert(w: Weather): { icon: string; message: string; severity: "info" | "warning" } | null {
  if (w.current.code >= 95) {
    return { icon: "⛈️", message: "Severe thunderstorm warning in this area.", severity: "warning" };
  }
  if (w.current.code >= 51 && w.current.code <= 82) {
    return { icon: "🌧️", message: "Rain currently falling. Roads may be slick.", severity: "info" };
  }
  const nextRain = w.hourly.slice(0, 4).find((h) => h.precipProb >= 60);
  if (nextRain) {
    const hour = nextRain.time.slice(11, 16);
    return {
      icon: "💧",
      message: `Rain expected around ${hour} (${nextRain.precipProb}% chance).`,
      severity: "info",
    };
  }
  const highWindLimit = w.unit === "imperial" ? 25 : 40;
  if (w.current.wind >= highWindLimit) {
    return {
      icon: "💨",
      message: `High wind advisory: gusts up to ${Math.round(w.current.wind)} ${w.unit === "imperial" ? "mph" : "km/h"}.`,
      severity: "warning",
    };
  }
  return null;
}

export function getClothingAdvice(w: Weather): string {
  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  let tip = "";

  if (tempC < 5) tip = "🧥 Heavy winter coat, gloves, and warm layers needed.";
  else if (tempC < 14) tip = "🧥 A warm jacket or sweater is recommended.";
  else if (tempC < 21) tip = "👕 Mild weather — light layers or long sleeves work best.";
  else if (tempC < 28) tip = "🩳 Warm and pleasant — comfortable t-shirt and shorts.";
  else tip = "☀️ Hot weather — stay hydrated and wear loose, breathable clothes.";

  if (w.current.code >= 51 && w.current.code <= 82) {
    tip += " Don't forget an umbrella! ☂️";
  } else if (w.current.uvIndex >= 6) {
    tip += " High UV — wear sunscreen and sunglasses. 🕶️";
  }

  return tip;
}
