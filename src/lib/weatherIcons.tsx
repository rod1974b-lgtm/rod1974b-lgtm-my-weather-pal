// src/lib/weatherIcons.tsx
import { useState } from "react";

/**
 * Accurately mapped dictionary connecting every semantic weather code to the exact
 * illustration file that visually depicts it (accounting for original file naming).
 */
export const watercolorIcons: Record<string, string> = {
  // Day
  "01d": "/icons/watercolor/04d_overcast.png",          // Smiling bright sun with rays (Clear sky)
  "02d": "/icons/watercolor/11d_thunderstorm.png",      // Sun behind small cloud (Mostly clear)
  "03d": "/icons/watercolor/11d_thunderstorm.png",      // Sun behind cloud (Partly cloudy)
  "04d_broken": "/icons/watercolor/50d_mist.png",       // Fluffy broken clouds
  "04d": "/icons/watercolor/02d_few_clouds.png",        // Dark gray overcast cloud (Overcast)
  "09d_drizzle": "/icons/watercolor/01d_clear_sky.png", // Cloud with 3 light drizzle drops
  "09d": "/icons/watercolor/13d_snow.png",              // Cloud with splashing shower rain drops
  "10d_light": "/icons/watercolor/01d_clear_sky.png",   // Light rain
  "10d": "/icons/watercolor/13d_snow.png",              // Steady rain cloud
  "10d_heavy": "/icons/watercolor/10d_heavy_rain.png",  // Dark cloud with torrential rain
  "11d": "/icons/watercolor/10d_light_rain.png",        // Dark storm cloud with yellow lightning bolt
  "13d": "/icons/watercolor/01n_clear_night.png",       // Blue sparkling snowflake

  // Night
  "01n": "/icons/watercolor/03d_scattered.png",         // Crescent moon with stars (Clear night)
  "02n": "/icons/watercolor/10n_rain_night.png",        // Crescent moon behind small clouds
  "03n": "/icons/watercolor/04n_overcast_night.png",    // Crescent moon behind fluffy clouds
  "04n_broken": "/icons/watercolor/09n_shower_night.png",// Broken clouds night
  "04n": "/icons/watercolor/09n_shower_night.png",      // Overcast night
  "09n_drizzle": "/icons/watercolor/04n_broken_night.png", // Night drizzle with moon
  "09n": "/icons/watercolor/03n_scattered_night.png",   // Night shower with crescent moon
  "10n": "/icons/watercolor/03n_scattered_night.png",   // Night rain with crescent moon
  "11n": "/icons/watercolor/02n_few_clouds_night.png",  // Night storm cloud with lightning
  "13n": "/icons/watercolor/13n_snow_night.png",        // Snowflake with crescent moon and stars

  // Atmosphere & Conditions
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",   // Muted sun behind atmospheric haze
  "50d_mist": "/icons/watercolor/04d_broken.png",       // Wavy mist bands
  "50d_fog": "/icons/watercolor/50d_dust.png",          // Thick horizontal fog bands
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_dust": "/icons/watercolor/50d_haze_pure.png",    // Swirling dust storm
  "50d_smoke": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_tornado": "/icons/watercolor/50d_tornado.png",   // Swirling tornado funnel
  "50d_wind": "/icons/watercolor/11n_thunderstorm_night.png", // Swirling wind gusts
  "50n": "/icons/watercolor/50d_wind.png",              // Night mist/fog with moon
  "50n_mist": "/icons/watercolor/04d_broken.png",
  "50n_fog": "/icons/watercolor/50d_wind.png",
};

export const fallbackIcons: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "🌤️",
  "02n": "🌙☁️",
  "03d": "⛅",
  "03n": "🌙☁️",
  "04d": "☁️",
  "04d_broken": "🌥️",
  "04n": "☁️",
  "04n_broken": "🌙☁️",
  "09d": "🌧️",
  "09d_drizzle": "🌦️",
  "09n": "🌧️",
  "09n_drizzle": "🌧️",
  "10d": "🌧️",
  "10d_light": "🌦️",
  "10d_heavy": "⛈️",
  "10n": "🌧️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50d_fog": "🌁",
  "50d_mist": "🌫️",
  "50d_haze": "🌫️",
  "50d_dust": "🌪️",
  "50d_tornado": "🌪️",
  "50d_wind": "💨",
  "50n": "🌫️",
  "50n_fog": "🌁",
};

export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase();
  const desc = (description || "").toLowerCase();

  if (code.startsWith("10") && (desc.includes("heavy") || desc.includes("torrential") || desc.includes("downpour"))) {
    return watercolorIcons["10d_heavy"] ?? "/icons/watercolor/10d_heavy_rain.png";
  }

  if ((code.startsWith("09") || code.startsWith("10")) && desc.includes("drizzle")) {
    const fallback = code.endsWith("n") ? watercolorIcons["09n_drizzle"] : watercolorIcons["09d_drizzle"];
    return fallback ?? watercolorIcons["09d_drizzle"] ?? "/icons/watercolor/01d_clear_sky.png";
  }

  if (code.startsWith("50") || desc.includes("haze") || desc.includes("fog") || desc.includes("mist")) {
    if (desc.includes("mist")) return (code.endsWith("n") ? watercolorIcons["50n_mist"] : watercolorIcons["50d_mist"]) ?? "/icons/watercolor/04d_broken.png";
    if (desc.includes("fog")) return (code.endsWith("n") ? watercolorIcons["50n_fog"] : watercolorIcons["50d_fog"]) ?? "/icons/watercolor/50d_dust.png";
    if (desc.includes("haze") || desc.includes("smog") || desc.includes("pm2.5")) return watercolorIcons["50d_haze"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
    if (desc.includes("dust") || desc.includes("sand")) return watercolorIcons["50d_dust"] ?? "/icons/watercolor/50d_haze_pure.png";
    if (desc.includes("smoke")) return watercolorIcons["50d_smoke"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
    if (desc.includes("tornado")) return watercolorIcons["50d_tornado"] ?? "/icons/watercolor/50d_tornado.png";
    if (desc.includes("wind")) return watercolorIcons["50d_wind"] ?? "/icons/watercolor/11n_thunderstorm_night.png";
    return watercolorIcons["50d"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
  }

  const direct = watercolorIcons[code];
  if (direct) return direct;

  const dayCode = code.replace("n", "d");
  const nightCode = code.replace("d", "n");
  return (
    watercolorIcons[dayCode] ??
    watercolorIcons[nightCode] ??
    watercolorIcons["01d"] ??
    "/icons/watercolor/04d_overcast.png"
  );
}

export function getWeatherIconWithFallback(iconCode: string, description?: string) {
  const url = getWeatherIcon(iconCode, description);
  const prefix = (iconCode || "").split("_")[0] || "01d";
  const fallback =
    fallbackIcons[iconCode] ||
    fallbackIcons[iconCode.replace("n", "d")] ||
    fallbackIcons[prefix] ||
    "⛅";
  return { url, fallback };
}

export function wmoToIconCode(
  wmoCode: number,
  isDay: number = 1
): { iconCode: string; desc: string } {
  const isNight = isDay === 0;

  switch (wmoCode) {
    case 0:
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear sky" };
    case 1:
      return { iconCode: isNight ? "02n" : "02d", desc: isNight ? "Mostly clear" : "Mainly clear" };
    case 2:
      return { iconCode: isNight ? "03n" : "03d", desc: "Partly cloudy" };
    case 3:
      return { iconCode: isNight ? "04n" : "04d", desc: "Overcast" };
    case 45:
      return { iconCode: isNight ? "50n_fog" : "50d_fog", desc: "Fog" };
    case 48:
      return { iconCode: isNight ? "50n_mist" : "50d_mist", desc: "Depositing rime fog" };
    case 51:
    case 53:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Drizzle" };
    case 55:
      return { iconCode: isNight ? "09n" : "09d", desc: "Dense drizzle" };
    case 56:
    case 57:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Freezing drizzle" };
    case 61:
      return { iconCode: isNight ? "10n" : "10d_light", desc: "Light rain" };
    case 63:
      return { iconCode: isNight ? "10n" : "10d", desc: "Moderate rain" };
    case 65:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Heavy rain" };
    case 66:
    case 67:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Freezing rain" };
    case 71:
    case 73:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow fall" };
    case 75:
    case 77:
      return { iconCode: isNight ? "13n" : "13d", desc: "Heavy snowfall" };
    case 80:
      return { iconCode: isNight ? "09n" : "09d", desc: "Rain showers" };
    case 81:
    case 82:
      return { iconCode: isNight ? "09n" : "10d_heavy", desc: "Heavy rain showers" };
    case 85:
    case 86:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow showers" };
    case 95:
      return { iconCode: isNight ? "11n" : "11d", desc: "Thunderstorm" };
    case 96:
    case 99:
      return { iconCode: isNight ? "11n" : "11d", desc: "Severe thunderstorm" };
    default:
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear" };
  }
}

export interface WeatherIconProps {
  code?: number | string;
  iconCode?: string;
  wmoCode?: number;
  isDay?: number;
  description?: string;
  className?: string;
  fallbackEmoji?: string;
}

export function WeatherIcon({
  code,
  iconCode,
  wmoCode,
  isDay = 1,
  description,
  className = "w-8 h-8",
  fallbackEmoji,
}: WeatherIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Accept code as number (WMO code) or string (iconCode)
  const effectiveWmo = wmoCode !== undefined ? wmoCode : (typeof code === "number" ? code : undefined);
  let resolvedCode = typeof code === "string" ? code : iconCode;
  let resolvedDesc = description;

  if (effectiveWmo !== undefined) {
    const mapped = wmoToIconCode(effectiveWmo, isDay);
    resolvedCode = mapped.iconCode;
    resolvedDesc = resolvedDesc || mapped.desc;
  }

  const { url, fallback } = getWeatherIconWithFallback(resolvedCode || "01d", resolvedDesc);
  const emoji = fallbackEmoji || fallback;

  if (imgFailed || !url) {
    return (
      <span className={`inline-flex items-center justify-center select-none text-2xl ${className}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={resolvedDesc || "weather icon"}
      className={`inline-block object-contain transition-opacity duration-200 select-none ${className}`}
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  );
}

export default WeatherIcon;
