export type WeatherUnit = "metric" | "imperial";

export type Place = {
  name: string;
  country?: string | undefined;
  latitude: number;
  longitude: number;
};

export type Weather = {
  place: Place;
  unit: WeatherUnit;
  fetchedAt: number;
  timezone: string;
  current: {
    temperature: number;
    feelsLike: number;
    code: number;
    humidity: number;
    wind: number;
    isDay: boolean;
  };
  hourly: {
    time: string;
    temperature: number;
    code: number;
    precipitation: number;
    isDay: boolean;
  }[];
  daily: {
    date: string;
    high: number;
    low: number;
    code: number;
    precipitation: number;
  }[];
};

export type CityResult = Place & { id: number };

export const DEFAULT_PLACE: Place = {
  name: "Bangkok",
  country: "Thailand",
  latitude: 13.7563,
  longitude: 100.5018,
};

const LAST_PLACE_KEY = "weather:last-place";
const UNIT_KEY = "weather:unit-pref";

function cacheKey(place: Place, unit: WeatherUnit) {
  return `weather:last:${place.latitude.toFixed(3)}:${place.longitude.toFixed(3)}:${unit}`;
}

export function readSavedPlace(): Place | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_PLACE_KEY) ?? "null") as Place | null;
    return parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number" && parsed.name
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function savePlace(place: Place) {
  try {
    localStorage.setItem(LAST_PLACE_KEY, JSON.stringify(place));
  } catch {
    /* Storage may be disabled. */
  }
}

export function readUnit(): WeatherUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveUnit(unit: WeatherUnit) {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    /* Storage may be disabled. */
  }
}

export function readCachedWeather(place: Place, unit: WeatherUnit): Weather | null {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(place, unit)) ?? "null") as Weather | null;
    return value && value.place && Array.isArray(value.hourly) && Array.isArray(value.daily) ? value : null;
  } catch {
    return null;
  }
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("City search is unavailable right now.");
  const payload = (await response.json()) as {
    results?: {
      id: number;
      name: string;
      country?: string;
      latitude: number;
      longitude: number;
      admin1?: string;
    }[];
  };
  return (payload.results ?? []).map((result) => ({
    id: result.id,
    name: result.admin1 && result.admin1 !== result.name ? `${result.name}, ${result.admin1}` : result.name,
    ...(result.country ? { country: result.country } : {}),
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

export async function fetchWeather(place: Place, unit: WeatherUnit): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: unit === "imperial" ? "fahrenheit" : "celsius",
    wind_speed_unit: unit === "imperial" ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: "7",
  }).toString();

  const response = await fetch(url);
  if (!response.ok) throw new Error("The forecast could not be refreshed.");

  const data = (await response.json()) as {
    timezone: string;
    current: {
      time: string;
      temperature_2m: number;
      apparent_temperature: number;
      weather_code: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      is_day: number;
    };
    hourly: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
      precipitation_probability: number[];
      is_day?: number[];
    };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };

  const hourIndex = Math.max(0, data.hourly.time.findIndex((time) => time >= data.current.time.slice(0, 13)));
  const weather: Weather = {
    place,
    unit,
    timezone: data.timezone,
    fetchedAt: Date.now(),
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      code: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      isDay: data.current.is_day === 1,
    },
    hourly: data.hourly.time.slice(hourIndex, hourIndex + 24).map((time, index) => ({
      time,
      temperature:
        (index === 0 ? data.current.temperature_2m : data.hourly.temperature_2m[hourIndex + index]) ??
        data.current.temperature_2m,
      code:
        (index === 0 ? data.current.weather_code : data.hourly.weather_code[hourIndex + index]) ??
        data.current.weather_code,
      precipitation: data.hourly.precipitation_probability[hourIndex + index] ?? 0,
      isDay: (data.hourly.is_day?.[hourIndex + index] ?? data.current.is_day) === 1,
    })),
    daily: data.daily.time.map((date, index) => ({
      date,
      high: data.daily.temperature_2m_max[index] ?? data.current.temperature_2m,
      low: data.daily.temperature_2m_min[index] ?? data.current.temperature_2m,
      code: data.daily.weather_code[index] ?? data.current.weather_code,
      precipitation: data.daily.precipitation_probability_max[index] ?? 0,
    })),
  };

  try {
    localStorage.setItem(cacheKey(place, unit), JSON.stringify(weather));
  } catch {
    /* Storage may be disabled. */
  }

  return weather;
}

export function describeWeather(code: number) {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "❄️" };
  if (code <= 82) return { label: "Rain showers", icon: "🌧️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  return { label: "Thunderstorm", icon: "⛈️" };
}

export function formatForecastTime(time: string, timezone: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: timezone }).format(new Date(time));
}

export function formatForecastDay(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: timezone }).format(new Date(`${date}T12:00:00`));
}
