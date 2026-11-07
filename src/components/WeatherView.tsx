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
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  text?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  tag?: string;
  tagKey?: string;
  category?: string;
  source?: string;
  headline?: string;
  headlineTh?: string;
  headlineEn?: string;
  urgency?: string;
  timeAgo?: string;
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
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_fog", fallback: "Fog" },
  51: { key: "cond_drizzle", fallback: "Drizzle" },
  53: { key: "cond_drizzle", fallback: "Drizzle" },
  55: { key: "cond_drizzle", fallback: "Drizzle" },
  56: { key: "cond_drizzle", fallback: "Drizzle" },
  57: { key: "cond_drizzle", fallback: "Drizzle" },
  61: { key: "cond_rain", fallback: "Rain" },
  63: { key: "cond_rain", fallback: "Rain" },
  65: { key: "cond_heavy_rain", fallback: "Heavy rain" },
  66: { key: "cond_heavy_rain", fallback: "Freezing rain" },
  67: { key: "cond_heavy_rain", fallback: "Heavy freezing rain" },
  71: { key: "cond_snow", fallback: "Snow" },
  73: { key: "cond_snow", fallback: "Snow" },
  75: { key: "cond_snow", fallback: "Heavy snow" },
  77: { key: "cond_snow", fallback: "Snow grains" },
  80: { key: "cond_showers", fallback: "Showers" },
  81: { key: "cond_showers", fallback: "Showers" },
  82: { key: "cond_showers", fallback: "Heavy showers" },
  85: { key: "cond_snow_showers", fallback: "Snow showers" },
  86: { key: "cond_snow_showers", fallback: "Heavy snow showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm", fallback: "Thunderstorm with hail" },
  99: { key: "cond_thunderstorm", fallback: "Severe thunderstorm" },
};

function getConditionLabel(code: number, t: TFunction): string {
  const item = WMO_KEY_MAP[code];
  if (item) return t(item.key, item.fallback);
  if (code <= 2) return t("cond_partly_cloudy", "Partly cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code <= 48) return t("cond_fog", "Fog");
  if (code <= 57) return t("cond_drizzle", "Drizzle");
  if (code <= 67) return t("cond_rain", "Rain");
  if (code <= 77) return t("cond_snow", "Snow");
  if (code <= 82) return t("cond_showers", "Showers");
  if (code <= 86) return t("cond_snow_showers", "Snow showers");
  return t("cond_thunderstorm", "Thunderstorm");
}

function getUvLabel(uv: number, t: TFunction): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

function getAqiLabel(aqi: number | undefined, t: TFunction): string {
  if (aqi === undefined) return "—";
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_sensitive", "Sensitive");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  if (aqi <= 300) return t("aqi_very_unhealthy", "Very Unhealthy");
  return t("aqi_unhealthy", "Hazardous");
}

function formatTimeAgo(timestamp: number, t: TFunction): string {
  if (!timestamp) return t("updated_now", "Updated just now");
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t("updated_now", "Updated just now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${t("ago", "ago")}`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ${t("ago", "ago")}`;
}

const DAY_LABELS: Record<string, string> = {
  en: "Day", th: "กลางวัน", es: "Día", ja: "昼", zh: "白天", hi: "दिन",
  fr: "Jour", de: "Tag", pt: "Dia", ru: "День", ar: "نهار", ko: "낮", id: "Siang", vi: "Ngày",
};

const NIGHT_LABELS: Record<string, string> = {
  en: "Night", th: "กลางคืน", es: "Noche", ja: "夜", zh: "夜晚", hi: "रात",
  fr: "Nuit", de: "Nacht", pt: "Noite", ru: "Ночь", ar: "ليل", ko: "밤", id: "Malam", vi: "Đêm",
};

const SPEED_UNITS = {
  en: { imperial: "mph", metric: "km/h" },
  th: { imperial: "ไมล์/ชม.", metric: "กม./ชม." },
  es: { imperial: "mph", metric: "km/h" },
  ja: { imperial: "mph", metric: "km/h" },
  zh: { imperial: "英里/小时", metric: "公里/小时" },
  hi: { imperial: "मील/घंटे", metric: "किमी/घंटे" },
  fr: { imperial: "mph", metric: "km/h" },
  de: { imperial: "mph", metric: "km/h" },
  pt: { imperial: "mph", metric: "km/h" },
  ru: { imperial: "миль/ч", metric: "км/ч" },
  ar: { imperial: "ميل/س", metric: "كم/س" },
  ko: { imperial: "mph", metric: "km/h" },
  id: { imperial: "mph", metric: "km/jam" },
  vi: { imperial: "dặm/h", metric: "km/h" },
};

const WEAR_CATEGORIES = {
  en: { casual: "Casual", business: "Business", sports: "Sports" },
  th: { casual: "ทั่วไป", business: "ทำงาน", sports: "ออกกำลังกาย" },
  es: { casual: "Casual", business: "Negocios", sports: "Deporte" },
  ja: { casual: "カジュアル", business: "ビジネス", sports: "スポーツ" },
  zh: { casual: "休闲日常", business: "商务通勤", sports: "运动健身" },
  hi: { casual: "कैज़ुअल", business: "कार्यालय", sports: "खेलकूद" },
  fr: { casual: "Décontracté", business: "Professionnel", sports: "Sport" },
  de: { casual: "Freizeit", business: "Business", sports: "Sport" },
  pt: { casual: "Casual", business: "Trabalho", sports: "Esporte" },
  ru: { casual: "Повседневный", business: "Деловой", sports: "Спорт" },
  ar: { casual: "يومي", business: "عمل", sports: "رياضة" },
  ko: { casual: "캐주얼", business: "비즈니스", sports: "운동/스포츠" },
  id: { casual: "Santai", business: "Kantor", sports: "Olahraga" },
  vi: { casual: "Hàng ngày", business: "Công sở", sports: "Thể thao" },
};

const ACCESSORY_LABELS = {
  en: {
    umbrella: "Umbrella",
    sunglasses: "Sunglasses",
    sunscreen: "SPF 30+",
    mask: "Mask (AQI)",
    scarf: "Scarf & Gloves",
    water: "Hydration",
    windbreaker: "Wind Shell",
    evening_drop: "Evening chill: drops to",
  },
  th: {
    umbrella: "พกร่ม",
    sunglasses: "แว่นกันแดด",
    sunscreen: "ทากันแดด",
    mask: "หน้ากากอนามัย",
    scarf: "ผ้าพันคอ/ถุงมือ",
    water: "จิบน้ำบ่อยๆ",
    windbreaker: "เสื้อกันลม",
    evening_drop: "ค่ำนี้อากาศเย็นลงเหลือ",
  },
  es: {
    umbrella: "Paraguas",
    sunglasses: "Gafas de sol",
    sunscreen: "Protector solar",
    mask: "Mascarilla",
    scarf: "Bufanda y guantes",
    water: "Agua extra",
    windbreaker: "Cortavientos",
    evening_drop: "Enfriamiento nocturno: baja a",
  },
  ja: {
    umbrella: "雨傘",
    sunglasses: "サングラス",
    sunscreen: "日焼け止め",
    mask: "マスク着用",
    scarf: "手袋・マフラー",
    water: "水分補給",
    windbreaker: "防風ウェア",
    evening_drop: "夜間の冷え込み:",
  },
  zh: {
    umbrella: "带雨伞",
    sunglasses: "佩戴墨镜",
    sunscreen: "涂抹防晒",
    mask: "防尘口罩",
    scarf: "围巾手套",
    water: "多补充水分",
    windbreaker: "防风外套",
    evening_drop: "傍晚降温至",
  },
  fr: {
    umbrella: "Parapluie",
    sunglasses: "Lunettes de soleil",
    sunscreen: "Crème solaire",
    mask: "Masque",
    scarf: "Écharpe et gants",
    water: "Hydratation",
    windbreaker: "Coupe-vent",
    evening_drop: "Baisse nocturne : descend à",
  },
  de: {
    umbrella: "Regenschirm",
    sunglasses: "Sonnenbrille",
    sunscreen: "Sonnencreme",
    mask: "Schutzmaske",
    scarf: "Schal & Handschuhe",
    water: "Viel trinken",
    windbreaker: "Windjacke",
    evening_drop: "Abendkühle: sinkt auf",
  },
  pt: {
    umbrella: "Guarda-chuva",
    sunglasses: "Óculos escuros",
    sunscreen: "Protetor solar",
    mask: "Máscara",
    scarf: "Cachecol e luvas",
    water: "Hidratação",
    windbreaker: "Corta-vento",
    evening_drop: "Queda à noite: desce para",
  },
  ru: {
    umbrella: "Зонт",
    sunglasses: "Солнцезащитные очки",
    sunscreen: "Защита от солнца",
    mask: "Маска",
    scarf: "Шарф и перчатки",
    water: "Больше воды",
    windbreaker: "Ветровка",
    evening_drop: "Вечернее похолодание: до",
  },
  ar: {
    umbrella: "مظلة",
    sunglasses: "نظارة شمسية",
    sunscreen: "واقي شمس",
    mask: "كمامة",
    scarf: "وشاح وقفازات",
    water: "شرب الماء",
    windbreaker: "سترة واقية",
    evening_drop: "انخفاض مسائي: يصل إلى",
  },
  ko: {
    umbrella: "우산 챙기기",
    sunglasses: "선글라스",
    sunscreen: "자외선 차단제",
    mask: "마스크 권장",
    scarf: "목도리와 장갑",
    water: "수분 보충",
    windbreaker: "바람막이",
    evening_drop: "저녁 기온 하강:",
  },
  id: {
    umbrella: "Bawa Payung",
    sunglasses: "Kacamata Hitam",
    sunscreen: "Tabir Surya",
    mask: "Masker",
    scarf: "Syal & Sarung Tangan",
    water: "Banyak Minum",
    windbreaker: "Jaket Angin",
    evening_drop: "Malam mendingin hingga",
  },
  vi: {
    umbrella: "Mang theo ô",
    sunglasses: "Kính râm",
    sunscreen: "Kem chống nắng",
    mask: "Khẩu trang",
    scarf: "Khăn & găng tay",
    water: "Bổ sung nước",
    windbreaker: "Áo gió",
    evening_drop: "Tối se lạnh giảm còn",
  },
  hi: {
    umbrella: "छाता रखें",
    sunglasses: "धूप का चश्मा",
    sunscreen: "सनस्क्रीन",
    mask: "मास्क",
    scarf: "मफलर और दस्ताने",
    water: "पानी पिएं",
    windbreaker: "विंडचीटर",
    evening_drop: "शाम को तापमान गिरेगा:",
  },
};

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "TMD Alert": "alert_thunderstorm_tag",
  "TMD Warning": "alert_thunderstorm_tag",
  "TMD Advisory": "alert_advisory",
  "Earthquake": "alert_earthquake_tag",
  "Earthquake Alert": "alert_earthquake_tag",
  "Flood Watch": "alert_flood_tag",
  "NWS Alert": "alert_hazard",
  "Air Quality": "air_quality",
  "Marine Warning": "alert_advisory",
  "Advisory": "alert_advisory",
  "Warning": "alert_hazard",
};

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

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [artIndex, setArtIndex] = useState(0);
  const [isDarkArtwork, setIsDarkArtwork] = useState<boolean>(false);

  // Clothing category selection with persistence
  const [wearCategory, setWearCategory] = useState<WearCategory>(() => {
    try {
      const saved = localStorage.getItem("weather:wear-category") as WearCategory;
      if (saved === "business" || saved === "sports" || saved === "casual") {
        return saved;
      }
    } catch {}
    return "casual";
  });

  const handleSelectCategory = (cat: WearCategory) => {
    setWearCategory(cat);
    try {
      localStorage.setItem("weather:wear-category", cat);
    } catch {}
  };

  const cityStorageKey = w?.place?.name
    ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}`
    : "";

  // Auto-detect whether the hero background picture is dark or light
  useEffect(() => {
    if (!heroBgUrl) {
      setIsDarkArtwork(!w?.current?.is_day);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = heroBgUrl;

    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalLum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }
        const avgLum = totalLum / count;
        setIsDarkArtwork(avgLum < 135);
      } catch {
        setIsDarkArtwork(!w?.current?.is_day);
      }
    };

    img.onerror = () => {
      if (!active) return;
      setIsDarkArtwork(!w?.current?.is_day);
    };

    return () => {
      active = false;
    };
  }, [heroBgUrl, w?.current?.is_day]);

  const handleSelectBackground = (url: string) => {
    setHeroBgUrl(url);
    if (cityStorageKey) {
      try {
        if (url) {
          localStorage.setItem(cityStorageKey, url);
        } else {
          localStorage.removeItem(cityStorageKey);
        }
      } catch {}
    }
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  useEffect(() => {
    if (!w?.place) return;

    try {
      const savedCityBg = localStorage.getItem(cityStorageKey);
      if (savedCityBg) {
        setHeroBgUrl(savedCityBg);
        return;
      }
    } catch {}

    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );

    const firstArt = arts[0];
    if (firstArt) {
      setHeroBgUrl(firstArt);
    } else {
      getCityWeatherBackground(
        w.place.name,
        conditionStr,
        w.current.code,
        w.current.temp,
        (loadedUrl) => {
          setHeroBgUrl(loadedUrl);
        },
        w.place.country,
        w.place.lat,
        w.place.lon
      ).then((res) => {
        if (res?.initialBg && !res.initialBg.startsWith("linear-gradient")) {
          setHeroBgUrl(res.initialBg);
        }
      }).catch(() => {});
    }
  }, [w?.place?.name, w?.current?.code, cityStorageKey]);

  if (!w) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-pulse">
        <p className="text-sm">{t("search_placeholder", "Loading local weather...")}</p>
      </div>
    );
  }

  const tempVal = Math.round(w.current.temp);
  const feelsVal = Math.round(w.current.feels);
  const conditionLabel = getConditionLabel(w.current.code, t);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";

  const speedUnits =
    SPEED_UNITS[lang as keyof typeof SPEED_UNITS] || SPEED_UNITS.en;
  const speedUnitStr = unit === "imperial" ? speedUnits.imperial : speedUnits.metric;

  const uvVal = w.current.uvIndex;
  const uvCategoryStr = getUvLabel(uvVal, t);

  const aqiVal = w.current.aqi;
  const aqiCategoryStr = getAqiLabel(aqiVal, t);

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
          ? "เสื้อยืดดรายฟิตระบายอากาศ กางเกงขาสั้นวิ่ง และถุงเท้ากีฬาซับแรงกระแทก"
          : "Moisture-wicking athletic tee, performance running shorts, and cushioned sports socks.";
      }
      return lang === "th"
        ? "เสื้อกล้ามหรือเสื้อวิ่งน้ำหนักเบาพิเศษ กางเกงขาสั้นระบายอากาศ และสายรัดข้อมือซับเหงื่อ"
        : "Ultralight running singlet, breathable running shorts, and sweat wristbands.";
    }

    // Default: Casual
    if (isRaining) {
      return lang === "th"
        ? "แจ็กเก็ตกันฝนแบบมีฮู้ด รองเท้ากันน้ำ หรือรองเท้าบูท และพกร่มพับติดตัว"
        : "Waterproof hooded jacket, water-resistant footwear, and a compact travel umbrella.";
    }
    if (isSnowing || tempC <= 5) {
      return lang === "th"
        ? "เสื้อแจ็กเก็ตบุนวมหรือดาวน์โค้ท เสื้อสเวตเตอร์หนา ผ้าพันคอ และถุงมืออุ่น"
        : "Heavy insulated down parka, thermal knit sweater, wool scarf, and warm gloves.";
    }
    if (tempC <= 14) {
      return lang === "th"
        ? "เสื้อแจ็กเก็ตเดนิม สเวตเตอร์ หรือเสื้อฮู้ดดี้ พร้อมกางเกงขายาวใส่สบาย"
        : "Layered denim jacket, cozy knit sweater, or hoodie with comfortable jeans or chinos.";
    }
    if (tempC <= 22) {
      return lang === "th"
        ? "เสื้อเชิ้ตแขนยาวผ้าคอตตอน สเวตเตอร์คอกลมเนื้อบาง หรือเสื้อยืดใส่สบาย"
        : "Long-sleeve cotton shirt, light crewneck sweater, or relaxed casual top.";
    }
    return lang === "th"
      ? "เสื้อยืดผ้าฝ้ายระบายอากาศ กางเกงขาสั้นหรือกางเกงผ้าโปร่งเบา แว่นกันแดด และหมวก"
      : "Breathable cotton tee, comfortable shorts or light linen pants, sunglasses, and a sun cap.";
  };

  // Weather-smart practical accessories
  const getSmartAccessories = (): string[] => {
    const items: string[] = [];
    if (isRaining) {
      items.push(accLabels.umbrella, accLabels.waterproof);
    }
    if (isSnowing || tempC <= 8) {
      items.push(accLabels.gloves, accLabels.scarf, accLabels.beanie);
    }
    if (tempC >= 25) {
      items.push(accLabels.sunglasses, accLabels.cap);
    }
    if (windKmh >= 24) {
      items.push(accLabels.windbreaker);
    }
    if (items.length === 0) {
      items.push(accLabels.watch, accLabels.backpack);
    }
    return items.slice(0, 3);
  };

  const smartAccessories = getSmartAccessories();
  const clothingAdvice = getExpandedClothingAdvice();

  // Condition description: translated localized description
  const translatedCondition =
    w.current.condition ||
    WMO_TRANSLATIONS[lang as keyof typeof WMO_TRANSLATIONS]?.[w.current.code] ||
    WMO_TRANSLATIONS.en[w.current.code] ||
    "Clear sky";

  return (
    <div className="space-y-4">
      {/* 1. DISASTER & ADVISORY ALERT TICKER */}
      <section className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {alertsToDisplay.length > 0 ? (
          <div className="flex items-center px-3 py-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            {/* Compact badge on phone, full text on tablet/desktop */}
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span className="hidden sm:inline">{t("alerts", "Weather Alerts")}</span>
              <span className="sm:hidden">⚠️</span>
              <span>({alertsToDisplay.length})</span>
            </span>

            <div className="overflow-hidden relative w-full flex items-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] py-0.5">
                {alertsToDisplay.map((alt) => {
                  const tagKey = alt.tagKey || (alt.tag ? TAG_TRANSLATION_MAP[alt.tag] : undefined);
                  const displayTag = tagKey ? t(tagKey, alt.tag || "Advisory") : alt.tag || "Advisory";
                  const displayHeadline =
                    lang === "th" && alt.headlineTh
                      ? alt.headlineTh
                      : alt.headlineEn || alt.text || alt.headline || "";

                  return (
                    <div key={alt.id} className="inline-flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {displayTag}
                      </span>
                      <span>{displayHeadline}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              {t("all_clear", "ALL CLEAR")}
              <span className="hidden sm:inline"> — {t("all_clear_sub", "No severe weather watches active in this region")}</span>
            </span>
          </div>
        )}
      </section>

      {/* 2. TOP ACTIONS BAR (Next Art & Favorite) */}
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted disabled:opacity-60 cursor-pointer"
            title={t("refresh", "Refresh")}
          >
            <span className={`text-sm ${loading ? "animate-spin" : ""}`}>🔄</span>
            <span className="hidden sm:inline">{t("refresh", "Refresh")}</span>
          </button>

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xs backdrop-blur-md transition cursor-pointer ${
                isFavorite
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-border/80 bg-card/85 text-foreground hover:bg-muted"
              }`}
              title={isFavorite ? t("remove_fav", "Remove from favorites") : t("save_fav", "Save to favorites")}
            >
              <span>{isFavorite ? "★" : "☆"}</span>
              <span className="hidden sm:inline">{isFavorite ? t("saved", "Saved") : t("save_fav", "Favorite")}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. HERO WEATHER CARD */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 shadow-md">
        {/* Artwork Canvas */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
          <img
            key={bgImage}
            src={bgImage}
            alt={`${w.place.name} ${translatedCondition}`}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover transition-opacity duration-700 select-none"
            onError={() => {
              const fallback = getCityFallbackBackground(w.place.name);
              if (bgImage !== fallback) {
                setBgImage(fallback);
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 pointer-events-none" />

          {/* Quick sky-switcher shortcut button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={() => setIsSkyModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 cursor-pointer"
              title="Change Sky Background"
            >
              <span>🎨</span>
              <span className="hidden sm:inline">Sky</span>
            </button>
          </div>
        </div>

        {/* Hero Weather Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white pointer-events-none">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1 drop-shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">{w.place.name}</span>
                {w.place.country && (
                  <span className="text-xs text-white/80 font-medium">{w.place.country}</span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-extrabold tracking-tighter">
                  {Math.round(w.current.temp)}°
                </span>
                <span className="text-base font-semibold capitalize text-white/95">
                  {translatedCondition}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/80">
                <span>{dayLabel}</span>
                <span>•</span>
                <span>
                  {t("feels_like", "Feels like")} {Math.round(w.current.feels_like)}°
                </span>
              </div>
            </div>

            {/* Hand-painted Weather Icon Badge */}
            <div className="shrink-0 drop-shadow-md">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.is_day}
                size={68}
                className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. CURRENT METRICS GRID */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Humidity */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("humidity", "Humidity")}</span>
          <p className="mt-1 text-lg font-bold text-foreground">{w.current.humidity}%</p>
        </div>

        {/* Wind */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("wind", "Wind")}</span>
          <p className="mt-1 text-lg font-bold text-foreground">
            {Math.round(w.current.wind)} {unit === "imperial" ? "mph" : "km/h"}
          </p>
        </div>

        {/* UV Index */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("uv_index", "UV Index")}</span>
          <p className="mt-1 text-lg font-bold text-foreground">
            {w.current.uv_index !== undefined ? w.current.uv_index.toFixed(1) : "—"}
          </p>
        </div>

        {/* Visibility */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("visibility", "Visibility")}</span>
          <p className="mt-1 text-lg font-bold text-foreground">
            {unit === "imperial"
              ? `${(w.current.visibility / 1609.34).toFixed(1)} mi`
              : `${(w.current.visibility / 1000).toFixed(1)} km`}
          </p>
        </div>
      </section>

      {/* 5. HOURLY FORECAST (24 Hours) */}
      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("hourly_forecast", "Hourly Forecast")}
        </h3>
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {hourlyToDisplay.map((h, i) => {
            const hourDate = new Date(h.time);
            const hourLabel = i === 0 ? t("now", "Now") : hourDate.getHours().toString().padStart(2, "0") + ":00";
            return (
              <div key={h.time} className="flex flex-col items-center gap-1.5 shrink-0 min-w-[54px] text-center">
                <span className="text-[11px] font-medium text-muted-foreground">{hourLabel}</span>
                <WeatherIcon code={h.code} isDay={h.is_day} size={32} />
                <span className="text-xs font-bold text-foreground">{Math.round(h.temp)}°</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY FORECAST */}
      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("seven_day_forecast", "7-Day Forecast")}
        </h3>
        <div className="divide-y divide-border/60">
          {dailyToDisplay.map((d, i) => {
            const date = new Date(d.date);
            const dayName = i === 0 ? t("today", "Today") : getDayName(date, lang);
            const conditionText =
              WMO_TRANSLATIONS[lang as keyof typeof WMO_TRANSLATIONS]?.[d.code] ||
              WMO_TRANSLATIONS.en[d.code] ||
              "";

            return (
              <div key={d.date} className="flex items-center justify-between py-2.5 text-xs">
                <span className="w-24 font-medium text-foreground">{dayName}</span>
                <div className="flex items-center gap-2 flex-1 px-2">
                  <WeatherIcon code={d.code} isDay={true} size={24} />
                  <span className="text-muted-foreground truncate">{conditionText}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-foreground w-16 justify-end">
                  <span>{Math.round(d.temp_max)}°</span>
                  <span className="text-muted-foreground/70 font-normal">{Math.round(d.temp_min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. WHAT TO WEAR RECOMMENDATIONS */}
      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("what_to_wear", "What to Wear")}
          </h3>
          {/* Category Selector Tabs */}
          <div className="flex items-center rounded-lg bg-muted/60 p-0.5 text-[11px] font-medium">
            {(["casual", "business", "sports"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setWearCategory(cat)}
                className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                  wearCategory === cat
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {catLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-foreground leading-relaxed mb-3">
          {clothingAdvice}
        </p>

        {/* Recommended Accessories */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            {t("accessories", "Recommended")}:
          </span>
          {smartAccessories.map((acc) => (
            <span
              key={acc}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
            >
              {acc}
            </span>
          ))}
        </div>
      </section>

      {/* Sky Theme Switcher Modal */}
      <SkySwitcherModal
        isOpen={isSkyModalOpen}
        onClose={() => setIsSkyModalOpen(false)}
        activeBg={bgImage}
        cityName={w.place.name}
        weatherCode={w.current.code}
        currentTemp={w.current.temp}
        isDay={w.current.is_day}
        onSelectBg={handleSelectBackground}
        onSelectBackground={handleSelectBackground}
      />
    </div>
  );
};

export default WeatherView;
