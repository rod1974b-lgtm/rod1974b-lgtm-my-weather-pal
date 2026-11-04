// src/components/WeatherView.tsx
import React, { useState, useEffect } from "react";
import type { TFunction } from "i18next";
import { type Weather, type WeatherUnit, type Place } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";

export interface TickerAlertItem {
  id: string;
  text?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  tag?: string;
  tagKey?: string;
  category?: string;
  source?: string;
  headline?: string;
  urgency?: string;
}

interface WeatherViewProps {
  weather?: Weather | null;
  w?: Weather | null;
  activeAlerts?: TickerAlertItem[];
  disasters?: TickerAlertItem[];
  unit: WeatherUnit;
  loading: boolean;
  onRefresh: () => void;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
  isFav?: boolean;
  onToggleFavorite?: () => void;
  onOpenAiGallery?: () => void;
  customBgUrl?: string | null;
}

type WearCategory = "casual" | "business" | "sports";

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_cloudy", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_fog", fallback: "Depositing rime fog" },
  51: { key: "cond_rain", fallback: "Light drizzle" },
  53: { key: "cond_rain", fallback: "Moderate drizzle" },
  55: { key: "cond_rain", fallback: "Dense drizzle" },
  61: { key: "cond_rain", fallback: "Slight rain" },
  63: { key: "cond_rain", fallback: "Moderate rain" },
  65: { key: "cond_heavy_rain", fallback: "Heavy rain" },
  71: { key: "cond_snow", fallback: "Slight snow" },
  73: { key: "cond_snow", fallback: "Moderate snow" },
  75: { key: "cond_heavy_snow", fallback: "Heavy snow" },
  80: { key: "cond_rain", fallback: "Slight rain showers" },
  81: { key: "cond_rain", fallback: "Moderate rain showers" },
  82: { key: "cond_heavy_rain", fallback: "Violent rain showers" },
  95: { key: "cond_storm", fallback: "Thunderstorm" },
  96: { key: "cond_storm", fallback: "Thunderstorm with slight hail" },
  99: { key: "cond_storm", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number, t: TFunction): string {
  const item = WMO_KEY_MAP[code];
  if (!item) return t("cond_cloudy", "Cloudy");
  return t(item.key, item.fallback);
}

function getAqiDescription(aqi: number, t: TFunction): string {
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_sensitive", "Sensitive");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  return t("aqi_hazardous", "Hazardous");
}

function getUvDescription(uv: number, t: TFunction): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

const DAY_LABELS: Record<string, string> = {
  en: "Day",
  th: "กลางวัน",
  es: "Día",
  ja: "昼",
  zh: "白天",
  fr: "Jour",
  de: "Tag",
  pt: "Dia",
  ru: "День",
  ar: "نهار",
  ko: "낮",
  id: "Siang",
  vi: "Ngày",
  hi: "दिन",
};

const NIGHT_LABELS: Record<string, string> = {
  en: "Night",
  th: "กลางคืน",
  es: "Noche",
  ja: "夜",
  zh: "夜晚",
  fr: "Nuit",
  de: "Nacht",
  pt: "Noite",
  ru: "Ночь",
  ar: "ليل",
  ko: "밤",
  id: "Malam",
  vi: "Đêm",
  hi: "रात",
};

const WEAR_CATEGORIES = {
  en: { casual: "Casual", business: "Business", sports: "Sports" },
  th: { casual: "ลำลอง", business: "ทำงาน", sports: "กีฬา" },
  es: { casual: "Casual", business: "Negocios", sports: "Deporte" },
  ja: { casual: "カジュアル", business: "ビジネス", sports: "スポーツ" },
  zh: { casual: "休闲", business: "商务", sports: "运动" },
  fr: { casual: "Décontracté", business: "Affaires", sports: "Sport" },
  de: { casual: "Freizeit", business: "Business", sports: "Sport" },
  pt: { casual: "Casual", business: "Trabalho", sports: "Esporte" },
  ru: { casual: "Повседневный", business: "Деловой", sports: "Спорт" },
  ar: { casual: "كاجوال", business: "عمل", sports: "رياضة" },
  ko: { casual: "캐주얼", business: "비즈니스", sports: "스포츠" },
  id: { casual: "Santai", business: "Bisnis", sports: "Olahraga" },
  vi: { casual: "Thường ngày", business: "Công sở", sports: "Thể thao" },
  hi: { casual: "कैजुअल", business: "व्यावसायिक", sports: "खेल" },
};

const ACCESSORY_LABELS = {
  en: {
    umbrella: "Umbrella",
    sunglasses: "Sunglasses",
    spf: "Sunscreen SPF",
    mask: "Air Mask (AQI)",
    scarf_gloves: "Scarf & Gloves",
    water: "Stay Hydrated",
    windbreaker: "Windbreaker",
  },
  th: {
    umbrella: "พกร่ม",
    sunglasses: "แว่นกันแดด",
    spf: "ทากันแดด SPF",
    mask: "หน้ากากกรองฝุ่น",
    scarf_gloves: "ผ้าพันคอ/ถุงมือ",
    water: "จิบน้ำสม่ำเสมอ",
    windbreaker: "เสื้อกันลม",
  },
  es: {
    umbrella: "Paraguas",
    sunglasses: "Gafas de sol",
    spf: "Protector SPF",
    mask: "Mascarilla (AQI)",
    scarf_gloves: "Bufanda y guantes",
    water: "Hidratación",
    windbreaker: "Cortavientos",
  },
  ja: {
    umbrella: "雨傘",
    sunglasses: "サングラス",
    spf: "日焼け止め",
    mask: "マスク (AQI)",
    scarf_gloves: "マフラー・手袋",
    water: "水分補給",
    windbreaker: "ウインドブレーカー",
  },
  zh: {
    umbrella: "雨伞",
    sunglasses: "太阳镜",
    spf: "防晒霜",
    mask: "口罩 (AQI)",
    scarf_gloves: "围巾和手套",
    water: "多喝水",
    windbreaker: "防风衣",
  },
  fr: {
    umbrella: "Parapluie",
    sunglasses: "Lunettes de soleil",
    spf: "Crème solaire",
    mask: "Masque (AQI)",
    scarf_gloves: "Écharpe et gants",
    water: "Hydratation",
    windbreaker: "Coupe-vent",
  },
  de: {
    umbrella: "Regenschirm",
    sunglasses: "Sonnenbrille",
    spf: "Sonnencreme",
    mask: "Maske (AQI)",
    scarf_gloves: "Schal & Handschuhe",
    water: "Viel trinken",
    windbreaker: "Windjacke",
  },
  pt: {
    umbrella: "Guarda-chuva",
    sunglasses: "Óculos de sol",
    spf: "Protetor solar",
    mask: "Máscara (AQI)",
    scarf_gloves: "Cachecol e luvas",
    water: "Hidratação",
    windbreaker: "Corta-vento",
  },
  ru: {
    umbrella: "Зонт",
    sunglasses: "Солнечные очки",
    spf: "Крем SPF",
    mask: "Маска (AQI)",
    scarf_gloves: "Шарф и перчатки",
    water: "Пейте воду",
    windbreaker: "Ветровка",
  },
  ar: {
    umbrella: "مظلة",
    sunglasses: "نظارة شمسية",
    spf: "واقي شمس",
    mask: "كمامة (AQI)",
    scarf_gloves: "وشاح وقفازات",
    water: "شرب الماء",
    windbreaker: "سترة واقية",
  },
  ko: {
    umbrella: "우산",
    sunglasses: "선글라스",
    spf: "선크림",
    mask: "마스크 (AQI)",
    scarf_gloves: "목도리 및 장갑",
    water: "수분 섭취",
    windbreaker: "바람막이",
  },
  id: {
    umbrella: "Payung",
    sunglasses: "Kacamata hitam",
    spf: "Tabir surya",
    mask: "Masker (AQI)",
    scarf_gloves: "Syal & Sarung tangan",
    water: "Minum air",
    windbreaker: "Jaket angin",
  },
  vi: {
    umbrella: "Mang ô",
    sunglasses: "Kính râm",
    spf: "Kem chống nắng",
    mask: "Khẩu trang (AQI)",
    scarf_gloves: "Khăn & Găng tay",
    water: "Uống nước",
    windbreaker: "Áo gió",
  },
  hi: {
    umbrella: "छाता",
    sunglasses: "धूप का चश्मा",
    spf: "सनस्क्रीन",
    mask: "मास्क (AQI)",
    scarf_gloves: "मफलर और दस्ताने",
    water: "पानी पिएं",
    windbreaker: "विंडचीटर",
  },
};

function formatLocalizedHour(timeStr: string, locale: string): string {
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString(locale, { hour: "numeric" });
    }
  } catch {}
  const match = timeStr.match(/(\d{1,2}):\d{2}/);
  if (match) {
    const h = parseInt(match[1], 10);
    return `${h}:00`;
  }
  return timeStr;
}

function formatLocalizedWeekday(dateStr: string, locale: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(locale, { weekday: "short" });
      }
    }
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toLocaleDateString(locale, { weekday: "short" });
    }
  } catch {}
  return dateStr;
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return "--:--";
  const m = isoStr.match(/T(\d{1,2}:\d{2})/);
  if (m) return m[1];
  const parts = isoStr.split(" ");
  if (parts[1]) return parts[1].slice(0, 5);
  return isoStr.slice(0, 5);
}

function formatLastUpdated(date: Date, locale: string): string {
  try {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: weatherProp,
  activeAlerts = [],
  disasters = [],
  unit,
  loading,
  onRefresh,
  onSelectBg,
  onSelectBackground,
  isFav,
  onToggleFavorite,
  onOpenAiGallery,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.toLowerCase().split("-")[0] || "en";
  const w = weather || weatherProp;

  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [artIndex, setArtIndex] = useState(0);
  const [isDarkArtwork, setIsDarkArtwork] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

  const [wearCategory, setWearCategory] = useState<WearCategory>(() => {
    try {
      const saved = localStorage.getItem("weather:wear-category");
      if (saved === "business" || saved === "sports" || saved === "casual") {
        return saved;
      }
    } catch {}
    return "casual";
  });

  const handleWearCategoryChange = (cat: WearCategory) => {
    setWearCategory(cat);
    try {
      localStorage.setItem("weather:wear-category", cat);
    } catch {}
  };

  useEffect(() => {
    setLastUpdatedTime(formatLastUpdated(new Date(), lang));
  }, [w?.current.temp, lang]);

  useEffect(() => {
    if (!w) return;
    const cityKey = w.place.name.toLowerCase().trim();
    const storedChoice =
      localStorage.getItem(`weather:custom-art:${cityKey}`) ||
      localStorage.getItem(`weather:custom-bg:${cityKey}`);

    if (storedChoice) {
      setHeroBgUrl(storedChoice);
      return;
    }

    const conditionStr = getConditionLabel(w.current.code, t);
    const bg = getCityWeatherBackground(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );
    setHeroBgUrl(bg);
  }, [w?.place.name, w?.current.code, t]);

  useEffect(() => {
    const handleBgChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ city?: string; url?: string }>;
      if (
        !customEvent.detail?.city ||
        customEvent.detail.city.toLowerCase() === w?.place.name.toLowerCase().trim()
      ) {
        if (customEvent.detail?.url) {
          setHeroBgUrl(customEvent.detail.url);
        }
      }
    };
    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => window.removeEventListener("weather:custom-bg-change", handleBgChange);
  }, [w?.place.name]);

  useEffect(() => {
    if (!heroBgUrl) return;
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = heroBgUrl;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalBrightness = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        const avgBrightness = totalBrightness / pixelCount;
        setIsDarkArtwork(avgBrightness < 135);
      } catch {
        setIsDarkArtwork(false);
      }
    };
    img.onerror = () => {
      if (isMounted) setIsDarkArtwork(false);
    };
    return () => {
      isMounted = false;
    };
  }, [heroBgUrl]);

  if (!w) return null;

  const tempUnit = unit === "imperial" ? "°F" : "°C";
  const windUnit = unit === "imperial" ? "mph" : "km/h";

  const conditionText = getConditionLabel(w.current.code, t);
  const feelsLike = Math.round(w.current.feels_like);
  const aqiValue = Math.round(w.current.aqi ?? 32);
  const uvValue = Math.round(w.current.uv ?? 0);
  const rainChance = Math.round(
    w.daily?.[0]?.rain_chance ??
      w.hourly?.[0]?.rain_chance ??
      w.hourly?.[0]?.pop ??
      0
  );
  const sunriseTime = formatTime(w.daily?.[0]?.sunrise);
  const sunsetTime = formatTime(w.daily?.[0]?.sunset);

  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;
  const dayLabel = (w.current.is_day ? DAY_LABELS[lang] : NIGHT_LABELS[lang]) || (w.current.is_day ? "Day" : "Night");

  const catLabels =
    WEAR_CATEGORIES[lang as keyof typeof WEAR_CATEGORIES] || WEAR_CATEGORIES.en;
  const accLabels =
    ACCESSORY_LABELS[lang as keyof typeof ACCESSORY_LABELS] || ACCESSORY_LABELS.en;

  // Temperature normalized in Celsius for advice logic
  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const code = w.current.code;
  const isRaining = code >= 95 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isSnowing = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
  const windKmh = unit === "imperial" ? w.current.wind * 1.60934 : w.current.wind;
  // Category-specific clothing advice generator
  const getExpandedClothingAdvice = (): string => {
    if (wearCategory === "business") {
      if (isRaining) {
        return lang === "th"
          ? "เสื้อเทรนช์โค้ทกันน้ำ รองเท้าหนังกันน้ำ และพกร่มทำงานคันใหญ่"
          : "Tailored commuter trench coat, water-resistant dress shoes, and a sturdy business umbrella.";
      }
      if (isSnowing || tempC <= 5) {
        return lang === "th"
          ? "เสื้อโค้ทผ้าวูลตัวยาวทับชุดสูท ผ้าพันคอแคชเมียร์ และถุงมือหนังสุภาพ"
          : "Tailored wool overcoat over suit, cashmere scarf, and insulated dress leather gloves.";
      }
      if (tempC <= 14) {
        return lang === "th"
          ? "เบลเซอร์ผ้าวูล เสื้อเชิ้ตคัตติ้งเนี้ยบ หรือสเวตเตอร์บางสวมทับเชิ้ต"
          : "Structured wool blazer, crisp dress shirt, and optional fine-knit sweater layer.";
      }
      if (tempC <= 22) {
        return lang === "th"
          ? "สูทหรือเบลเซอร์เนื้อเบา เสื้อเชิ้ตระบายอากาศดี และกางเกงสแล็คทรงสวย"
          : "Lightweight tailored blazer, breathable poplin dress shirt, and classic chinos or trousers.";
      }
      return lang === "th"
        ? "กางเกงผ้าลินินผสมหรือผ้าวูลเนื้อบาง เสื้อเชิ้ตแขนสั้นทรงสุภาพ และรองเท้าโลฟเฟอร์"
        : "Breathable linen-blend trousers, lightweight short-sleeve dress shirt, and comfortable loafers.";
    }

    if (wearCategory === "sports") {
      if (isRaining) {
        return lang === "th"
          ? "เสื้อวิ่งกันน้ำแบบมีฮู้ด หมวกแก๊ปกันฝนเข้าตา และรองเท้าวิ่งยึดเกาะพิเศษ"
          : "Water-repellent running shell, brimmed cap to shield eyes, and high-traction athletic shoes.";
      }
      if (isSnowing || tempC <= 5) {
        return lang === "th"
          ? "ชุดรัดกล้ามเนื้อเก็บความอบอุ่น กางเกงวิ่งกันลม ถุงมือวิ่ง และที่คาดหู"
          : "Thermal compression base layer, windproof running tights, light sports gloves, and ear warmer.";
      }
      if (tempC <= 14) {
        return lang === "th"
          ? "เสื้อออกกำลังกายแขนยาวผ้าระบายเหงื่อ กางเกงแทร็คแพนต์ และเสื้อกั๊กกันลม"
          : "Long-sleeve technical athletic shirt, breathable training tights, and lightweight packable wind shell.";
      }
      if (tempC <= 22) {
        return lang === "th"
          ? "เสื้อยืดกีฬาเนื้อดรายฟิต กางเกงขาสั้นวิ่ง ถุงเท้ากีฬา และรองเท้าวิ่งคู่ใจ"
          : "Moisture-wicking technical tee, lightweight running shorts, and cushioned trainers.";
      }
      return lang === "th"
        ? "เสื้อกล้ามวิ่งตาข่ายระบายอากาศ กางเกงขาสั้นวิ่งกันเสียดสี แถบซับเหงื่อ และพกน้ำดื่ม"
        : "Ultra-breathable mesh singlet, anti-chafing running shorts, sweatband, and electrolyte hydration.";
    }

    // Default: Casual
    if (isRaining) {
      return t("wear_umbrella", "Carry a sturdy umbrella or waterproof shell and water-resistant sneakers.");
    }
    if (isSnowing || tempC <= 5) {
      return t("wear_heavy_coat", "Heavy thermal coat, insulated scarf, beanie, and winter boots recommended.");
    }
    if (tempC <= 14) {
      return t("wear_jacket", "A warm jacket, cozy knitwear, or windbreaker layered over casual denim.");
    }
    if (tempC <= 21) {
      return t("wear_mild", "Comfortable layers, long sleeves, or a casual light cardigan with chinos or jeans.");
    }
    return t("wear_light", "Lightweight breathable fabrics, cotton tee, sunglasses, and sun protection.");
  };

  // Smart accessory badges calculation
  const accessories: { icon: string; label: string }[] = [];
  if (isRaining || (w.hourly?.[0]?.precipProb !== undefined && w.hourly[0].precipProb >= 30)) {
    accessories.push({ icon: "☂️", label: accLabels.umbrella });
  }
  if (w.current.is_day && uvVal >= 3) {
    accessories.push({ icon: "🕶️", label: accLabels.sunglasses });
  }
  if (w.current.is_day && uvVal >= 6) {
    accessories.push({ icon: "🧴", label: accLabels.sunscreen });
  }
  if (aqiVal !== undefined && aqiVal > 100) {
    accessories.push({ icon: "😷", label: accLabels.mask });
  }
  if (tempC <= 8) {
    accessories.push({ icon: "🧣", label: accLabels.scarf });
  }
  if (tempC >= 29) {
    accessories.push({ icon: "💧", label: accLabels.water });
  }
  if (windKmh >= 24 && !accessories.some((a) => a.icon === "☂️")) {
    accessories.push({ icon: "💨", label: accLabels.windbreaker });
  }

  // Evening drop calculation from daily max/min
  const todayForecast = w.daily?.[0];
  const hasEveningDrop =
    todayForecast &&
    todayForecast.max - todayForecast.min >= (unit === "imperial" ? 14 : 7);

  const handleNextArtwork = (e: React.MouseEvent) => {
    e.stopPropagation();
    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );
    if (arts.length === 0) return;

    const nextIdx = (artIndex + 1) % arts.length;
    setArtIndex(nextIdx);
    const nextUrl = arts[nextIdx];
    if (nextUrl) {
      handleSelectBackground(nextUrl);
    }
  };

  // 100% transparent styling with deep drop-shadow for contrast over any artwork
  const cityBadgeClass =
    "inline-flex items-center gap-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]";

  const tempBadgeClass =
    "inline-flex items-baseline gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]";

  return (
    <div className="space-y-4">
      {/* 1. DISASTER & ADVISORY ALERT TICKER */}
      <section className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {alertsToDisplay.length > 0 ? (
          <div className="flex items-center px-3 py-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>{t("alerts", "Weather Alerts")} ({alertsToDisplay.length})</span>
            </span>

            <div className="overflow-hidden relative w-full flex items-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] py-0.5">
                {alertsToDisplay.map((alt) => {
                  const tagKey = alt.tagKey || (alt.tag ? TAG_TRANSLATION_MAP[alt.tag] : undefined);
                  const displayTag = tagKey ? t(tagKey, alt.tag || "Advisory") : alt.tag || "Advisory";

                  return (
                    <div key={alt.id} className="inline-flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {displayTag}
                      </span>
                      <span>{alt.text ?? alt.headline ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>{t("all_clear", "ALL CLEAR")} — {t("all_clear_sub", "No severe weather watches active in this region")}</span>
          </div>
        )}
      </section>

      {/* 2. TOP ACTIONS BAR (Next Art, Refresh, and Favorite) */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {w.place.name}
        </span>
        <div className="flex items-center gap-2">
          {/* Next Artwork Button */}
          <button
            type="button"
            onClick={handleNextArtwork}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer"
            title={t("next_art", "Next Artwork")}
          >
            <span className="text-sm">↻</span>
            <span>{t("next_art", "Next Art")}</span>
          </button>

          {/* Refresh Weather Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer disabled:opacity-50"
              title={t("refresh", "Refresh Weather")}
              aria-label={t("refresh", "Refresh Weather")}
            >
              <span className={`text-sm inline-block ${loading ? "animate-spin" : ""}`}>🔄</span>
              <span className="hidden sm:inline">{t("refresh", "Refresh")}</span>
            </button>
          )}

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="flex items-center justify-center rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer"
              title={isFav ? t("remove_favorite", "Remove from favorites") : t("add_favorite", "Add to favorites")}
              aria-pressed={!!isFav}
            >
              <span className="inline-block text-sm">
                {isFav ? "❤️" : "🤍"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. STREAMLINED HERO CARD (Only City, Temp, and Weather Icon) */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 p-5 shadow-lg bg-card text-card-foreground min-h-[250px] flex flex-col justify-between">
        {heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url(${heroBgUrl})`,
              filter: "brightness(0.98) saturate(1.1)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between flex-1 w-full">
          {/* Top: City Name (Transparent) */}
          <div className="flex items-start justify-between">
            <div className={cityBadgeClass}>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {w.place.name}
              </h2>
              {w.place.country && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-white/40 text-white/95">
                  {w.place.country}
                </span>
              )}
            </div>
          </div>

          {/* Bottom: Big Temperature & Weather Icon locked to bottom edge */}
          <div className="mt-auto flex items-end justify-between pt-4">
            <div className={tempBadgeClass}>
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter">
                {tempVal}
              </span>
              <span className="text-2xl font-bold text-white/90">
                {tempUnitStr}
              </span>
            </div>

            <WeatherIcon
              code={w.current.code}
              isDay={w.current.is_day}
              className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </section>

      {/* 4. CURRENT CONDITIONS DETAILS CARD (All Basic Weather Info) */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        {/* Top Header Row: Condition, Day/Night, High/Low, and Last Updated */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground">
              {conditionLabel}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium text-xs text-muted-foreground">
              {dayLabel}
            </span>
            {w.daily?.[0] && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-foreground">
                  H: {Math.round(w.daily[0].max)}° <span className="text-muted-foreground font-normal">/</span> L: {Math.round(w.daily[0].min)}°
                </span>
              </>
            )}
          </div>

          <span className="text-muted-foreground text-[11px]">
            {formatTimeAgo(w.fetchedAt, t)}
          </span>
        </div>

        {/* Basic Weather Info Grid (8 Key Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Feels Like */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">🌡️</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("feels_like", "Feels Like")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {feelsVal}{tempUnitStr}
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">💧</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("humidity", "Humidity")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {w.current.humidity}%
              </span>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">💨</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("wind", "Wind")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {Math.round(w.current.wind)} <span className="text-[11px] font-normal text-muted-foreground">{speedUnitStr}</span>
              </span>
            </div>
          </div>

          {/* Rain / Precip Probability */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">🌧️</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("rain_chance", "Rain Chance")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {w.daily?.[0]?.precipProbMax ?? 0}%
              </span>
            </div>
          </div>

          {/* UV Index */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">☀️</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("uv_index", "UV Index")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {uvVal} <span className="text-[11px] font-normal text-muted-foreground">({uvCategoryStr})</span>
              </span>
            </div>
          </div>

          {/* Air Quality (AQI) */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">🍃</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("air_quality", "Air Quality")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {aqiVal ?? "--"} <span className="text-[11px] font-normal text-muted-foreground">({aqiCategoryStr})</span>
              </span>
            </div>
          </div>

          {/* Sunrise */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">🌅</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("sunrise", "Sunrise")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {w.sun.sunrise}
              </span>
            </div>
          </div>

          {/* Sunset */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
            <span className="text-lg">🌇</span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {t("sunset", "Sunset")}
              </span>
              <span className="text-sm font-bold text-foreground">
                {w.sun.sunset}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHAT TO WEAR RECOMMENDATION (Expanded with Occasion & Accessories) */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">👕</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("what_to_wear", "What to Wear Today")}
            </h3>
          </div>

          {/* Interactive Occasion Pills */}
          <div className="inline-flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => handleSelectCategory("casual")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "casual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {catLabels.casual}
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory("business")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "business"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {catLabels.business}
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory("sports")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "sports"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {catLabels.sports}
            </button>
          </div>
        </div>

        {/* Dynamic Advice Text */}
        <p className="text-sm font-medium leading-snug text-foreground/90 pt-0.5">
          {getExpandedClothingAdvice()}
        </p>

        {/* Smart Accessories Badges Row */}
        {accessories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            {accessories.map((acc, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/50 border border-border/50 text-[11px] font-medium text-foreground/80"
              >
                <span>{acc.icon}</span>
                <span>{acc.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Evening Temperature Swing Warning */}
        {hasEveningDrop && todayForecast && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <span>🌙</span>
            <span>
              {accLabels["evening_drop"]} {Math.round(todayForecast.min)}{tempUnitStr}
            </span>
          </div>
        )}
      </section>

      {/* 6. HOURLY FORECAST (24 Hours Rolling from Now) */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("hourly_forecast", "Hourly Forecast")}
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {w.hourly.map((h, i) => {
            const timeLabel =
              i === 0
                ? t("now", "Now")
                : new Date(h.time).toLocaleTimeString(lang, {
                    hour: "numeric",
                    minute: "2-digit",
                  });

            return (
              <div
                key={h.time}
                className="flex flex-col items-center justify-between min-w-[72px] p-2.5 rounded-xl bg-muted/40 border border-border/40 shrink-0 snap-start text-center"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {timeLabel}
                </span>
                <WeatherIcon
                  code={h.code}
                  isDay={h.is_day ?? 1}
                  className="w-8 h-8 my-2"
                />
                <span className="text-sm font-bold">
                  {Math.round(h.temp)}°
                </span>
                {h.precipProb !== undefined && h.precipProb >= 15 && (
                  <span className="text-[10px] font-semibold text-blue-500 mt-1">
                    💧{h.precipProb}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY EXTENDED FORECAST (With Weather Words visible on both mobile & desktop) */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("daily_forecast", "7-Day Forecast")}
        </h3>
        <div className="space-y-2">
          {w.daily.map((d, i) => {
            const dateObj = new Date(d.date + "T12:00:00");
            const dayName =
              i === 0
                ? t("today", "Today")
                : dateObj.toLocaleDateString(lang, { weekday: "short" });

            return (
              <div
                key={d.date}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition text-sm"
              >
                <div className="w-16 sm:w-20 font-medium shrink-0">
                  {dayName}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                  <WeatherIcon code={d.code} isDay={1} className="w-6 h-6 shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {getConditionLabel(d.code, t)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold shrink-0">
                  <span className="text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground/60 text-xs">/</span>
                  <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default WeatherView;
