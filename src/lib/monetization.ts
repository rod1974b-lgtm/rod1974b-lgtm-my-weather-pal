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

// ROOT BEER TIERS — Deeper amber watercolor ribbon unified, no price pure gratitude
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
    price: 0.99,
    displayPrice: "$0.99",
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
    price: 2.99,
    displayPrice: "$2.99",
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
      noAdsDays: 7,
      label: "2 BGs + 2 AI + 2 static + 1 animated FOREVER + 7 days no ads + Medium thank-you forever",
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
    price: 4.99,
    displayPrice: "$4.99",
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
      noAdsDays: 30,
      label: "3 BGs + 3 AI + 4 static + 2 animated FOREVER + 30 days no ads + Large thank-you + video",
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
    price: 9.99,
    displayPrice: "$9.99",
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
      noAdsDays: 365,
      label: "ALL 6 BGs + 10 AI + 8 static + 4 animated FOREVER + 365 days no ads + Party thank-you + video",
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
  const noAdsUntil = Date.now() + tier.bonus.noAdsDays * 24 * 60 * 60 * 1000;
  localStorage.setItem(`no_ads_until`, noAdsUntil.toString());

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
  const until = localStorage.getItem(`ad_unlocked_${bgId}`);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
};

export const getAdUnlockedBackgrounds = (): string[] => {
  return ADS_BACKGROUNDS.filter((bg) => isAdUnlocked(bg));
};

// ============================================================================
// DONATION LINKS & MEDIAN GOOGLE PLAY BILLING BRIDGE
// ============================================================================
export type DonationProvider = "stripe" | "buymeacoffee" | "kofi" | "paypal";

// Paste the real links here as each account is created.
export const DONATION_CONFIG = {
  paypalUsername: "rod1974b",
  buyMeACoffeePage: "", // e.g. https://buymeacoffee.com/myusername
  kofiPage: "", // e.g. https://ko-fi.com/myusername
  stripeLinks: {
    small_root_beer_tier: "", // Stripe Payment Link for $0.99
    medium_root_beer_tier: "", // Stripe Payment Link for $2.99
    large_root_beer_tier: "", // Stripe Payment Link for $4.99
    party_pack_root_beer_tier: "", // Stripe Payment Link for $9.99
    ai_gallery_lifetime_unlock: "", // Stripe Payment Link for $1.99
  } as Record<string, string>,
};

const findTier = (tierId: string) =>
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);

export const getDonationUrl = (
  tierId: string,
  provider: DonationProvider
): string => {
  const tier = findTier(tierId);
  const amount = tier?.price ? tier.price.toFixed(2) : "1.99";
  const note = encodeURIComponent(tier?.name || "My Weather Pal support");

  switch (provider) {
    case "stripe": {
      const link = DONATION_CONFIG.stripeLinks[tierId];
      if (link) return link;
      // Generic Stripe fallback (replace with a real Payment Link).
      return `https://buy.stripe.com/${tierId}`;
    }
    case "buymeacoffee": {
      if (DONATION_CONFIG.buyMeACoffeePage) {
        return `${DONATION_CONFIG.buyMeACoffeePage}/?amount=${amount}`;
      }
      return `https://buymeacoffee.com/?amount=${amount}`;
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
// onSuccess fires after the bridge reports a completed purchase;
// onError fires when the bridge is missing, cancelled, or errors.
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
        if (
          result?.event === "purchase成功".replace("成功", "Successed") ||
          result?.event === "purchaseSuccessed" ||
          result?.event === "purchaseSucceeded" ||
          result?.event === "purchase_success" ||
          !result?.event
        ) {
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
