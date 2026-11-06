// src/lib/monetization.ts

// FREE: 3 backgrounds + 2 AI forever free (no ads, no purchase)
export const FREE_BACKGROUNDS = ["clear_day", "clear_night", "cloudy_day"] as const;
export const FREE_AI_SLOTS = 2;
export const FREE_AI_GENERATIONS = 2;

// ADS: 2 backgrounds + 3 AI for 24h via rewarded ad
export const ADS_BACKGROUNDS = ["rainy", "snowy"] as const;
export const ADS_AI_SLOTS = 3;
export const ADS_AI_GENERATIONS = 3;
export const ADS_DURATION_HOURS = 24;
export const ADMOB_REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY";

// PREMIUM: Only with Root Beer / Lifetime
export const PREMIUM_BACKGROUNDS = ["haze", "storm"] as const;
export const ALL_BACKGROUNDS = [
  ...FREE_BACKGROUNDS,
  ...ADS_BACKGROUNDS,
  ...PREMIUM_BACKGROUNDS,
] as const;

// ROOT BEER TIERS — Deeper amber watercolor ribbon unified
export interface RootBeerTier {
  id: string;
  name: string;
  level: number;
  price: number;
  displayPrice: string;
  thankYouText: string;
  thankYouBackground: string;
  ribbonColor: string;
  bubbles: number;
  sounds: string;
  bonus: {
    backgrounds: string[];
    aiBackgrounds: number;
    staticMascots: number;
    animatedMascots: number;
    noAdsDays: number;
    noAdsForever?: boolean;
    label: string;
  };
  files: {
    staticTransparent: string;
    staticFull?: string;
    video?: string;
    lottie?: string;
  };
}

export const ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE: RootBeerTier[] = [
  {
    id: "small_root_beer_tier",
    name: "Small Root Beer Tier",
    level: 1,
    price: 1.0,
    displayPrice: "$1",
    thankYouText: "Small Root Beer Tier - Thank You!",
    thankYouBackground: "small_amber_thankyou_bg",
    ribbonColor: "deeper amber watercolor rich warm golden brown #8B4513",
    bubbles: 1,
    sounds: "pop — Soft *pop!* + light bubble fizzing + cozy chime",
    bonus: {
      backgrounds: ["rainy"],
      aiBackgrounds: 1,
      staticMascots: 1,
      animatedMascots: 0,
      noAdsDays: 0,
      label: "1 BG + 1 AI + 1 mascot FOREVER + Small thank-you forever",
    },
    files: {
      staticTransparent: "/tier%20plans/static_transparent_deeper_amber/small_amber_transparent.png",
      staticFull: "/tier%20plans/static_transparent_deeper_amber/small_amber_transparent.png",
      lottie: "/tier%20plans/lottie_and_gifs/burger_bounce.json",
    },
  },
  {
    id: "medium_root_beer_tier",
    name: "Medium Root Beer Tier",
    level: 2,
    price: 3.0,
    displayPrice: "$3",
    thankYouText: "Medium Root Beer Tier - Thank You!",
    thankYouBackground: "medium_amber_thankyou_bg",
    ribbonColor: "deeper amber watercolor rich warm golden brown #8B4513",
    bubbles: 3,
    sounds: "fizz — Creamy fizzing *pffffff* + gentle *plop* + warmer chime",
    bonus: {
      backgrounds: ["rainy", "snowy"],
      aiBackgrounds: 2,
      staticMascots: 2,
      animatedMascots: 1,
      noAdsDays: 30,
      label: "2 BGs + 2 AI + 2 static + 1 animated FOREVER + 30 days no ads",
    },
    files: {
      staticTransparent: "/tier%20plans/static_transparent_deeper_amber/medium_amber_transparent.png",
      staticFull: "/tier%20plans/static_transparent_deeper_amber/medium_amber_transparent.png",
      lottie: "/tier%20plans/lottie_and_gifs/float_bounce.json",
    },
  },
  {
    id: "large_root_beer_tier",
    name: "Large Root Beer Tier",
    level: 3,
    price: 5.0,
    displayPrice: "$5",
    thankYouText: "Large Root Beer Tier - Thank You!",
    thankYouBackground: "large_amber_thankyou_bg",
    ribbonColor: "deeper amber watercolor rich warm golden brown #8B4513",
    bubbles: 5,
    sounds: "glug glug creamy fizz legendary — hearty glug, creamy foam, legendary chime",
    bonus: {
      backgrounds: ["rainy", "snowy", "haze"],
      aiBackgrounds: 3,
      staticMascots: 4,
      animatedMascots: 2,
      noAdsDays: 365,
      label: "3 BGs + 3 AI + 4 static + 2 animated FOREVER + 1 year no ads + Video",
    },
    files: {
      staticTransparent: "/tier%20plans/static_transparent_deeper_amber/large_amber_transparent.png",
      staticFull: "/tier%20plans/static_transparent_deeper_amber/large_amber_transparent.png",
      video: "/tier%20plans/animated_videos_no_price/large_root_beer_tier_thank_you_no_price_deeper_amber.mp4",
      lottie: "/tier%20plans/lottie_and_gifs/mascot_bounce.json",
    },
  },
  {
    id: "party_pack_root_beer_tier",
    name: "Party Pack Root Beer Tier",
    level: 4,
    price: 10.0,
    displayPrice: "$10",
    thankYouText: "Party Pack Root Beer Tier - Thank You!",
    thankYouBackground: "party_amber_thankyou_bg",
    ribbonColor: "deeper amber watercolor rich warm golden brown #8B4513",
    bubbles: 12,
    sounds: "BOOM confetti 3 mugs cheering fanfare — explosive confetti, party cheers, celebration fanfare",
    bonus: {
      backgrounds: ["rainy", "snowy", "haze", "storm"],
      aiBackgrounds: 10,
      staticMascots: 8,
      animatedMascots: 4,
      noAdsDays: 36500,
      noAdsForever: true,
      label: "ALL 6 BGs + 10 AI + 8 static + 4 animated + NO ADS FOREVER + Video",
    },
    files: {
      staticTransparent: "/tier%20plans/static_transparent_deeper_amber/party_amber_transparent.png",
      staticFull: "/tier%20plans/static_transparent_deeper_amber/party_amber_transparent.png",
      video: "/tier%20plans/animated_videos_no_price/party_pack_root_beer_tier_thank_you_no_price_deeper_amber.mp4",
      lottie: "/tier%20plans/lottie_and_gifs/party_bounce.json",
    },
  },
];

export const SORTED_TIERS = [...ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE].sort(
  (a, b) => a.level - b.level
);
export const PLAY_BILLING_PRODUCT_IDS = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.map(
  (t) => t.id
);
export const LIFETIME_PRODUCT_ID = "ai_gallery_lifetime_unlock";
export const LIFETIME_PRICE = "$1.99";
export const LIFETIME_AI_PER_DAY = 10;

export type BackgroundAccess = "free" | "ads_24h" | "premium" | "thankyou_forever";

export const getBackgroundAccess = (
  bgId: string,
  unlockedThankYouBgs: string[],
  adUnlocked: string[]
): BackgroundAccess => {
  if ((FREE_BACKGROUNDS as readonly string[]).includes(bgId)) return "free";
  if (unlockedThankYouBgs.includes(bgId)) return "thankyou_forever";
  if ((ADS_BACKGROUNDS as readonly string[]).includes(bgId)) {
    return adUnlocked.includes(bgId) ? "free" : "ads_24h";
  }
  return "premium";
};

export const getThankYouBackground = (tierId: string) => {
  const tier = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);
  return tier?.thankYouBackground || "default_thankyou_bg";
};

export const saveThankYouBackgroundForever = (tierId: string) => {
  if (typeof window === "undefined") return null;
  const tier = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);
  if (!tier) return null;

  localStorage.setItem(`thankyou_bg_${tierId}`, tier.thankYouBackground);
  localStorage.setItem(`thankyou_unlocked_${tierId}`, "true");

  tier.bonus.backgrounds.forEach((bg) => {
    localStorage.setItem(`unlocked_bg_${bg}`, "true");
    localStorage.setItem(`unlocked_bg_${bg}_forever`, "true");
  });

  localStorage.setItem(`bonus_ai_bgs_${tierId}`, tier.bonus.aiBackgrounds.toString());

  // Handle ad-free expiration
  if (tier.bonus.noAdsForever) {
    localStorage.setItem("no_ads_forever", "true");
    localStorage.setItem(
      "no_ads_until",
      (Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toString()
    );
  } else if (tier.bonus.noAdsDays > 0) {
    const noAdsUntil = Date.now() + tier.bonus.noAdsDays * 24 * 60 * 60 * 1000;
    localStorage.setItem("no_ads_until", noAdsUntil.toString());
  }

  try {
    const purchases = JSON.parse(localStorage.getItem("rootbeer_purchases") || "[]");
    purchases.push({ tierId, date: Date.now(), bonus: tier.bonus });
    localStorage.setItem("rootbeer_purchases", JSON.stringify(purchases));
  } catch {}

  return tier;
};

export const isThankYouBackgroundUnlocked = (tierId: string) => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`thankyou_unlocked_${tierId}`) === "true";
};

export const getAllUnlockedThankYouBackgrounds = (): string[] => {
  if (typeof window === "undefined") return [];
  return ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.filter((t) =>
    isThankYouBackgroundUnlocked(t.id)
  ).map((t) => t.thankYouBackground);
};

export const unlockWithAd24h = (bgId: string) => {
  if (typeof window === "undefined") return;
  const until = Date.now() + ADS_DURATION_HOURS * 60 * 60 * 1000;
  localStorage.setItem(`ad_unlocked_${bgId}`, until.toString());
};

export const isAdUnlocked = (bgId: string): boolean => {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("no_ads_forever") === "true") return true;
  const noAdsUntil = localStorage.getItem("no_ads_until");
  if (noAdsUntil && Date.now() < parseInt(noAdsUntil, 10)) return true;
  const until = localStorage.getItem(`ad_unlocked_${bgId}`);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
};

export const getAdUnlockedBackgrounds = (): string[] => {
  return ADS_BACKGROUNDS.filter((bg) => isAdUnlocked(bg));
};

// ============================================================================
// DONATION CONFIGURATION & AUTO-REDIRECT TRACKING
// ============================================================================
export type DonationProvider = "stripe" | "buymeacoffee" | "kofi" | "paypal";

export const PENDING_TIER_KEY = "weather:pending-donation-tier";

export const setPendingDonationTier = (tierId: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_TIER_KEY, tierId);
  } catch {}
};

export const getPendingDonationTier = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_TIER_KEY);
  } catch {
    return null;
  }
};

export const clearPendingDonationTier = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_TIER_KEY);
  } catch {}
};

export const DONATION_CONFIG = {
  paypalUsername: "rod1974b",
  buyMeACoffeePage: "https://buymeacoffee.com/rod1974b",
  buyMeACoffeeExtras: {
    small_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595466",
    medium_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595468",
    large_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595470",
    party_pack_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595471",
  } as Record<string, string>,
  kofiPage: "",
  stripeLinks: {
    small_root_beer_tier: "",
    medium_root_beer_tier: "",
    large_root_beer_tier: "",
    party_pack_root_beer_tier: "",
    ai_gallery_lifetime_unlock: "",
  } as Record<string, string>,
};

const findTier = (tierId: string) =>
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);

export const getDonationUrl = (
  tierId: string,
  provider: DonationProvider
): string => {
  const tier = findTier(tierId);
  const amount = tier?.price ? tier.price.toFixed(2) : "1.00";
  const note = encodeURIComponent(tier?.name || "My Weather Pal support");

  switch (provider) {
    case "buymeacoffee": {
      const directExtraUrl = DONATION_CONFIG.buyMeACoffeeExtras[tierId];
      if (directExtraUrl) return directExtraUrl;
      const base = DONATION_CONFIG.buyMeACoffeePage || "https://buymeacoffee.com/rod1974b";
      return tier?.price ? `${base}?amount=${tier.price}` : base;
    }
    case "stripe": {
      const link = DONATION_CONFIG.stripeLinks[tierId];
      if (link) return link;
      return `https://buy.stripe.com/${tierId}`;
    }
    case "kofi": {
      return DONATION_CONFIG.kofiPage || "https://ko-fi.com/";
    }
    case "paypal":
    default: {
      return `https://paypal.me/${DONATION_CONFIG.paypalUsername}/${amount}USD?locale.x=en_US&note=${note}`;
    }
  }
};

// Detects the Median.co Android WebView wrapper.
export const isMedianAndroidApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    median?: unknown;
    MedIAN?: unknown;
  };
  return (
    typeof w.median !== "undefined" ||
    typeof w.MedIAN !== "undefined" ||
    /median/i.test(navigator.userAgent || "")
  );
};

// Google Play In-App Purchase through the Median bridge.
export const purchaseTierViaGooglePlay = (
  tierId: string,
  onSuccess: () => void,
  onError: (err: { message?: string } | null) => void
): void => {
  if (typeof window === "undefined") {
    onError({ message: "Purchase unavailable in this environment." });
    return;
  }
  const bridge = (window as unknown as {
    median?: {
      iap?: {
        purchase?: (opts: {
          productID?: string;
          productId?: string;
          callback?: (result: { event?: string; errorMessage?: string }) => void;
        }) => void;
      };
    };
  }).median;

  if (!bridge?.iap?.purchase) {
    onError({
      message: "Google Play billing is not available. Use a payment method above.",
    });
    return;
  }

  try {
    bridge.iap.purchase({
      productID: tierId,
      callback: (result) => {
        const event = (result?.event || "").toLowerCase();
        if (!event || event.includes("success")) {
          onSuccess();
        } else {
          onError({ message: result?.errorMessage || "Purchase was cancelled." });
        }
      },
    });
  } catch (err: any) {
    onError({ message: err?.message || "Purchase was cancelled." });
  }
};
