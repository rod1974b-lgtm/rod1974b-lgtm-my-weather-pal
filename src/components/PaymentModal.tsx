// src/components/PaymentModal.tsx
import React, { useState } from "react";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  getDonationUrl,
  isMedianAndroidApp,
  purchaseTierViaGooglePlay,
  saveThankYouBackgroundForever,
  type RootBeerTier,
  type DonationProvider,
} from "@/lib/monetization";

interface PaymentModalProps {
  tierId: string;
  onClose: () => void;
  onSuccess?: (tierId: string) => void;
}

export function PaymentModal({ tierId, onClose, onSuccess }: PaymentModalProps) {
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [playBillingLoading, setPlayBillingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tier: RootBeerTier | undefined = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find(
    (t) => t.id === tierId
  );

  if (!tier) return null;

  const isAndroidMedian = typeof window !== "undefined" && isMedianAndroidApp();

  const handleOpenWebPayment = (provider: DonationProvider, label: string) => {
    try {
      const url = getDonationUrl(tier.id, provider);
      window.open(url, "_blank", "noopener,noreferrer");
      setSelectedProvider(label);
      setHasOpenedCheckout(true);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage("Could not open payment link. Please try another method.");
    }
  };

  const handleGooglePlayPurchase = () => {
    setPlayBillingLoading(true);
    setErrorMessage(null);

    purchaseTierViaGooglePlay(
      tier.id,
      () => {
        setPlayBillingLoading(false);
        handleClaimRewards();
      },
      (err: any) => {
        setPlayBillingLoading(false);
        setErrorMessage(
          err?.message || "Google Play billing was cancelled or unavailable. You can use Credit/Debit card above."
        );
      }
    );
  };

  const handleClaimRewards = () => {
    saveThankYouBackgroundForever(tier.id);
    window.dispatchEvent(
      new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId: tier.id } })
    );
    if (onSuccess) {
      onSuccess(tier.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card/95 border border-amber-500/30 rounded-2xl shadow-2xl p-5 overflow-hidden text-foreground">
        {/* Amber Glow Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm transition cursor-pointer"
        >
          ✕
        </button>

        {/* Tier Header */}
        <div className="flex items-center gap-3.5 mb-4 pr-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/30 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            {tier.files?.staticTransparent ? (
              <img
                src={tier.files.staticTransparent}
                alt={tier.name}
                className="w-10 h-10 object-contain drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              "🍺"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground truncate">
                {tier.name}
              </h3>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                {tier.displayPrice}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {tier.bonus.label}
            </p>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {errorMessage}
          </div>
        )}

        {!hasOpenedCheckout ? (
          /* Step 1: Pick payment method */
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Select how you'd like to support:
            </p>

            {/* 1. Debit or Credit Card (Stripe) */}
            <button
              type="button"
              onClick={() => handleOpenWebPayment("stripe", "Debit / Credit Card")}
              className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-700/10 hover:from-amber-500/20 hover:to-amber-700/20 border border-amber-500/40 hover:border-amber-500/60 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Debit or Credit Card
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-700 dark:text-amber-300">
                      No account needed
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Visa, Mastercard, Amex, Apple Pay & Google Pay
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </button>

            {/* 2. Buy Me a Coffee */}
            <button
              type="button"
              onClick={() => handleOpenWebPayment("buymeacoffee", "Buy Me a Coffee")}
              className="w-full text-left p-3 rounded-xl bg-card/80 hover:bg-muted/60 border border-border/80 hover:border-amber-500/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">☕</span>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Buy Me a Coffee
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Supports Cards, Apple Pay & direct checkout
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </button>

            {/* 3. PayPal */}
            <button
              type="button"
              onClick={() => handleOpenWebPayment("paypal", "PayPal")}
              className="w-full text-left p-3 rounded-xl bg-card/80 hover:bg-muted/60 border border-border/80 hover:border-amber-500/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🅿️</span>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    PayPal / Guest Card
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    PayPal account or Card guest checkout
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </button>

            {/* 4. Google Play (If on Android APK) */}
            {isAndroidMedian && (
              <button
                type="button"
                onClick={handleGooglePlayPurchase}
                disabled={playBillingLoading}
                className="w-full text-left p-3 rounded-xl bg-card/80 hover:bg-muted/60 border border-border/80 hover:border-amber-500/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">▶️</span>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Google Play Store
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        In-App Purchase
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {playBillingLoading
                        ? "Connecting to Google Play..."
                        : "Charge to your saved Google Play card"}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform">
                  {playBillingLoading ? "⏳" : "→"}
                </span>
              </button>
            )}

            <div className="pt-2 text-center">
              <p className="text-[10px] text-muted-foreground">
                🔒 Secure, SSL-encrypted checkout. Unlocks perks permanently on this device.
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: User opened checkout in new tab */
          <div className="text-center py-2 space-y-3.5">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl animate-pulse">
              💳
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">
                Completing Checkout via {selectedProvider}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Your payment page opened in a new tab. Once you complete the donation, tap the button below to claim your permanent bonuses!
              </p>
            </div>

            <button
              type="button"
              onClick={handleClaimRewards}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-600/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🎉</span>
              <span>I've Completed My Donation (Unlock Perks)</span>
            </button>

            <button
              type="button"
              onClick={() => setHasOpenedCheckout(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline transition cursor-pointer"
            >
              Need to pick a different payment method?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;
