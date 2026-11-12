"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  api,
  DEFAULT_GOOGLE_REVIEWS_CONFIG,
  type GoogleReviewItem,
  type GoogleReviewsConfig,
  type GoogleReviewsStatus,
} from "@/lib/api";
import { notifySiteContentUpdated } from "@/lib/reels";

export default function GoogleReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [envPlaceIdConfigured, setEnvPlaceIdConfigured] = useState(false);
  const [cacheMinutes, setCacheMinutes] = useState(360);
  const [status, setStatus] = useState<GoogleReviewsStatus>("api_key_missing");
  const [config, setConfig] = useState<GoogleReviewsConfig>(DEFAULT_GOOGLE_REVIEWS_CONFIG);
  const [reviews, setReviews] = useState<GoogleReviewItem[]>([]);

  const [businessName, setBusinessName] = useState(DEFAULT_GOOGLE_REVIEWS_CONFIG.businessName);
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState(DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl);
  const [placeId, setPlaceId] = useState("");
  const [writeReviewUrl, setWriteReviewUrl] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingApi, setSyncingApi] = useState(false);

  const applyConfigToInputs = useCallback((nextCfg: GoogleReviewsConfig) => {
    setConfig(nextCfg);
    setBusinessName(nextCfg.businessName || "Sri Saraswathi Dental Clinic");
    setGoogleReviewsUrl(nextCfg.googleReviewsUrl || DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl);
    setPlaceId(nextCfg.placeId || "");
    setWriteReviewUrl(nextCfg.writeReviewUrl || "");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminGoogleReviews();
      applyConfigToInputs(res.config);
      setReviews(Array.isArray(res.reviews) ? res.reviews : []);
      setApiConfigured(Boolean(res.apiConfigured));
      setEnvPlaceIdConfigured(Boolean(res.envPlaceIdConfigured));
      setCacheMinutes(Number(res.cacheMinutes || 360));
      setStatus(res.status || "empty");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Google Reviews configuration");
    } finally {
      setLoading(false);
    }
  }, [applyConfigToInputs]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const computedWriteUrlPreview = useMemo(() => {
    if (writeReviewUrl.trim()) return writeReviewUrl.trim();
    if (placeId.trim()) {
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`;
    }
    return googleReviewsUrl.trim() || DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl;
  }, [googleReviewsUrl, placeId, writeReviewUrl]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.updateGoogleReviewsConfig({
        businessName: businessName.trim() || "Sri Saraswathi Dental Clinic",
        googleReviewsUrl: googleReviewsUrl.trim() || DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl,
        writeReviewUrl: writeReviewUrl.trim(),
        placeId: placeId.trim(),
      });
      applyConfigToInputs(res.config);
      setApiConfigured(Boolean(res.apiConfigured));
      notifySiteContentUpdated();
      toast.success("Google Business Profile links saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save Google Reviews settings");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncFromApi = async () => {
    if (!apiConfigured) {
      toast.error("GOOGLE_PLACES_API_KEY is not configured in server / Hostinger environment variables.");
      return;
    }
    setSyncingApi(true);
    try {
      const res = await api.syncGoogleReviews(placeId.trim() || undefined);
      applyConfigToInputs(res.config);
      setReviews(Array.isArray(res.reviews) ? res.reviews : []);
      setStatus(res.status);
      notifySiteContentUpdated();
      toast.success(
        `Synced ${res.importedCount} verified review${res.importedCount === 1 ? "" : "s"} from Google Places API`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google Places API sync failed");
    } finally {
      setSyncingApi(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#073B43]/70">
            Automatic Official Sync
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#073B43] sm:text-3xl">
            Google Verified Reviews
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Automatically resolves your clinic Place ID and fetches authentic customer ratings and reviews from the
            official Google Places API (New) and Place Details API. No manual review uploads are required or permitted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={googleReviewsUrl || DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#073B43]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#073B43] shadow-sm transition hover:bg-[#FAF8F4]"
          >
            <span>Open Google Profile</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5 space-y-5 border-[#073B43]/12 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#073B43]">Google Places API Integration</h2>
              <p className="text-xs text-muted-foreground">
                Server-side key only · Cached every {cacheMinutes} mins
              </p>
            </div>
            {apiConfigured && status === "synced" ? (
              <Badge variant="success">API Synced</Badge>
            ) : apiConfigured ? (
              <Badge variant="warning">API Key Active</Badge>
            ) : (
              <Badge variant="danger">API Key Missing</Badge>
            )}
          </div>

          <div
            className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
              apiConfigured
                ? status === "sync_error"
                  ? "border-amber-200 bg-amber-50/80 text-amber-950"
                  : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                : "border-amber-200 bg-amber-50/80 text-amber-950"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {apiConfigured && status !== "sync_error" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div>
                {!apiConfigured ? (
                  <>
                    <p className="font-semibold">Set GOOGLE_PLACES_API_KEY in Hostinger Environment Variables</p>
                    <p className="mt-1 opacity-90">
                      Add <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">GOOGLE_PLACES_API_KEY</code>{" "}
                      (with <strong>Places API (New)</strong> enabled in Google Cloud Console) to Hostinger Node.js
                      environment variables or <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">.env</code>.
                      Once set, Place ID, rating, review count, and reviews sync automatically with zero manual entry.
                    </p>
                  </>
                ) : status === "sync_error" && config.lastSyncError ? (
                  <>
                    <p className="font-semibold">Last Google API Sync Error</p>
                    <p className="mt-1 opacity-90">{config.lastSyncError}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Official Google Places API Connected</p>
                    <p className="mt-1 opacity-90">
                      Homepage visitors receive cached Google reviews automatically refreshed every {cacheMinutes} minutes.
                      Google Places API provides up to 5 most relevant reviews plus the clinic&apos;s aggregate rating and total count.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#073B43]">
                Clinic Display Name
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Sri Saraswathi Dental Clinic"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#073B43]">
                Google Business Profile URL (View All Button)
              </label>
              <Input
                type="url"
                value={googleReviewsUrl}
                onChange={(e) => setGoogleReviewsUrl(e.target.value)}
                placeholder="https://share.google/SOW6zQnrpqeVVJPPh"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#073B43]">
                Google Place ID (Auto-resolved when blank{envPlaceIdConfigured ? " · Set via Env" : ""})
              </label>
              <Input
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Auto-resolved via Google Places Text Search"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#073B43]">
                Custom Write-a-Review URL (Optional Override)
              </label>
              <Input
                type="url"
                value={writeReviewUrl}
                onChange={(e) => setWriteReviewUrl(e.target.value)}
                placeholder="Leave blank to auto-derive from resolved Place ID"
              />
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                Active Write-a-Review link: <span className="font-mono">{computedWriteUrlPreview}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Profile URLs
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSyncFromApi()}
                disabled={syncingApi || !apiConfigured}
              >
                {syncingApi ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Sync Google Reviews Now
              </Button>
            </div>

            {config.lastSyncedAt && (
              <p className="text-[11px] text-muted-foreground">
                Last official Google API sync: {new Date(config.lastSyncedAt).toLocaleString("en-IN")}
              </p>
            )}
          </form>
        </Card>

        <Card className="lg:col-span-7 border-[#073B43]/12 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#073B43]">
                Live Synced Google Reviews ({reviews.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Read-only official Google Places API data. Google returns up to 5 recent highlights alongside your clinic rating.
              </p>
            </div>
            {typeof config.overallRating === "number" && config.overallRating > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#FFF9E6] px-3 py-1 text-xs font-bold text-[#073B43]">
                <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{config.overallRating.toFixed(1)}/5</span>
                {typeof config.totalReviews === "number" && config.totalReviews > 0 && (
                  <span className="font-medium text-[#707574]">({config.totalReviews} reviews)</span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking Google Places API status...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#073B43]/20 bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#073B43]">
                {apiConfigured
                  ? "No Google reviews cached yet"
                  : "Waiting for GOOGLE_PLACES_API_KEY in server environment"}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                {apiConfigured
                  ? "Click 'Sync Google Reviews Now' to resolve your Place ID and pull live customer feedback from Google."
                  : "Once GOOGLE_PLACES_API_KEY is configured in Hostinger environment variables, real Google customer names, stars, comments, and review dates will load automatically here and on your homepage."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-border/80 bg-[#FAF8F4]/55 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#073B43]">{review.author}</span>
                      <Badge variant="success">Google Verified API</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.relativeTime || review.reviewDate}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= review.rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs font-semibold text-[#073B43]">{review.rating}.0</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#15191B]/85">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
