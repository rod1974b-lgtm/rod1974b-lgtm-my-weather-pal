import { useState } from "react";

export const watercolorIcons: Record<string, string> = {
  // Day
  "01d": "/icons/watercolor/04d_overcast.png",
  "02d": "/icons/watercolor/11d_thunderstorm.png",
  "03d": "/icons/watercolor/11d_thunderstorm.png",
  "04d_broken": "/icons/watercolor/50d_mist.png",
  "04d": "/icons/watercolor/02d_few_clouds.png",
  "09d_drizzle": "/icons/watercolor/01d_clear_sky.png",
  "09d": "/icons/watercolor/13d_snow.png",
  "10d_light": "/icons/watercolor/01d_clear_sky.png",
  "10d": "/icons/watercolor/13d_snow.png",
  "10d_heavy": "/icons/watercolor/10d_heavy_rain.png",
  "11d": "/icons/watercolor/10d_light_rain.png",
  "13d": "/icons/watercolor/01n_clear_night.png",

  // Night
  "01n": "/icons/watercolor/03d_scattered.png",
  "02n": "/icons/watercolor/10n_rain_night.png",
  "03n": "/icons/watercolor/04n_overcast_night.png",
  "04n_broken": "/icons/watercolor/09n_shower_night.png",
  "04n": "/icons/watercolor/09n_shower_night.png",
  "09n_drizzle": "/icons/watercolor/04n_broken_night.png",
  "09n": "/icons/watercolor/03n_scattered_night.png",
  "10n": "/icons/watercolor/03n_scattered_night.png",
  "11n": "/icons/watercolor/02n_few_clouds_night.png",
  "13n": "/icons/watercolor/13n_snow_night.png",

  // Atmosphere & Conditions
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_mist": "/icons/watercolor/04d_broken.png",
  "50d_fog": "/icons/watercolor/50d_dust.png",
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_dust": "/icons/watercolor/50d_haze_pure.png",
  "50d_smoke": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_tornado": "/icons/watercolor/50d_tornado.png",
  "50d_wind": "/icons/watercolor/11n_thunderstorm_night.png",
  "50n": "/icons/watercolor/50d_wind.png",
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
  "50d_mist": "🌫️",
  "50d_fog": "🌫️",
  "50d_haze": "🌫️",
  "50d_dust": "💨",
  "50d_smoke": "🌫️",
  "50d_tornado": "🌪️",
  "50d_wind": "💨",
  "50n": "🌫️",
};

export function wmoToIconCode(wmo: number, isDay = true): { iconCode: string; desc: string } {
  const d = isDay ? "d" : "n";
  if (wmo === 0) return { iconCode: `01${d}`, desc: isDay ? "Clear sky" : "Clear night" };
  if (wmo === 1) return { iconCode: `02${d}`, desc: isDay ? "Mainly clear" : "Partly cloudy night" };
  if (wmo === 2) return { iconCode: `03${d}`, desc: isDay ? "Partly cloudy" : "Scattered clouds" };
  if (wmo === 3) return { iconCode: `04${d}`, desc: "Overcast" };
  if (wmo === 45 || wmo === 48) return { iconCode: `50${d}_fog`, desc: "Fog" };
  if (wmo >= 51 && wmo <= 57) return { iconCode: `09${d}_drizzle`, desc: "Drizzle" };
  if (wmo >= 61 && wmo <= 65) return { iconCode: `10${d}`, desc: "Rain" };
  if (wmo >= 71 && wmo <= 77) return { iconCode: `13${d}`, desc: "Snow" };
  if (wmo >= 80 && wmo <= 82) return { iconCode: `09${d}`, desc: "Showers" };
  if (wmo >= 95) return { iconCode: `11${d}`, desc: "Thunderstorm" };
  return { iconCode: `02${d}`, desc: "Partly cloudy" };
}

export function getWeatherIconWithFallback(code: string, _description?: string): { url?: string; fallback: string } {
  const clean = code.trim();
  const url = watercolorIcons[clean] ?? watercolorIcons[clean.slice(0, 3)];
  const fallback = fallbackIcons[clean] ?? fallbackIcons[clean.slice(0, 3)] ?? "🌤️";
  return { url, fallback };
}

export interface WeatherIconProps {
  code?: string | number;
  iconCode?: string;
  wmoCode?: number;
  isDay?: boolean;
  description?: string;
  className?: string;
  fallbackEmoji?: string;
}

export function WeatherIcon({
  code,
  iconCode,
  wmoCode,
  isDay = true,
  description,
  className = "size-8",
  fallbackEmoji,
}: WeatherIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const effectiveWmo = wmoCode !== undefined ? wmoCode : typeof code === "number" ? code : undefined;
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
