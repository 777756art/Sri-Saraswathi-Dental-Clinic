"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import {
  api,
  DEFAULT_GOOGLE_REVIEWS_CONFIG,
  DEFAULT_GOOGLE_REVIEWS_URL,
  type GoogleReviewItem,
  type GoogleReviewsConfig,
  type GoogleReviewsStatus,
} from "@/lib/api";
import { notifySiteContentUpdated } from "@/lib/reels";

interface ReviewFormData {
  id?: number;
  author: string;
  rating: number;
  comment: string;
  reviewDate: string;
  reviewUrl: string;
  authorPhotoUrl: string;
  isVerified: boolean;
  published: boolean;
}

const initialFormData: ReviewFormData = {
  author: "",
  rating: 5,
  comment: "",
  reviewDate: "Recent review",
  reviewUrl: DEFAULT_GOOGLE_REVIEWS_URL,
  authorPhotoUrl: "",
  isVerified: true,
  published: true,
};

export default function GoogleReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [status, setStatus] = useState<GoogleReviewsStatus>("manual_verified");
  const [config, setConfig] = useState<GoogleReviewsConfig>(DEFAULT_GOOGLE_REVIEWS_CONFIG);
  const [reviews, setReviews] = useState<GoogleReviewItem[]>([]);

  // Config form state
  const [enabled, setEnabled] = useState(true);
  const [businessName, setBusinessName] = useState(DEFAULT_GOOGLE_REVIEWS_CONFIG.businessName);
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState(DEFAULT_GOOGLE_REVIEWS_URL);
  const [writeReviewUrl, setWriteReviewUrl] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [overallRating, setOverallRating] = useState("4.9");
  const [totalReviews, setTotalReviews] = useState("449");
  const [maxDisplayCount, setMaxDisplayCount] = useState("6");
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingApi, setSyncingApi] = useState(false);

  // Review Modal state (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<GoogleReviewItem | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [savingReview, setSavingReview] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const applyConfigToInputs = useCallback((nextCfg: GoogleReviewsConfig) => {
    setConfig(nextCfg);
    setEnabled(nextCfg.enabled !== false);
    setBusinessName(nextCfg.businessName || "Sri Saraswathi Dental Clinic");
    setGoogleReviewsUrl(nextCfg.googleReviewsUrl || DEFAULT_GOOGLE_REVIEWS_URL);
    setPlaceId(nextCfg.placeId || "");
    setWriteReviewUrl(nextCfg.writeReviewUrl || "");
    setOverallRating(
      typeof nextCfg.overallRating === "number" ? String(nextCfg.overallRating) : "4.9"
    );
    setTotalReviews(
      typeof nextCfg.totalReviews === "number" ? String(nextCfg.totalReviews) : "449"
    );
    setMaxDisplayCount(
      typeof nextCfg.maxDisplayCount === "number" ? String(nextCfg.maxDisplayCount) : "6"
    );
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminGoogleReviews();
      applyConfigToInputs(res.config);
      setReviews(Array.isArray(res.reviews) ? res.reviews : []);
      setApiConfigured(Boolean(res.apiConfigured));
      setStatus(res.status || "manual_verified");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Google Reviews configuration"
      );
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
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
        placeId.trim()
      )}`;
    }
    return googleReviewsUrl.trim() || DEFAULT_GOOGLE_REVIEWS_URL;
  }, [googleReviewsUrl, placeId, writeReviewUrl]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const ratingNum = parseFloat(overallRating);
      const totalNum = parseInt(totalReviews, 10);
      const maxNum = parseInt(maxDisplayCount, 10);

      const res = await api.updateGoogleReviewsConfig({
        enabled,
        businessName: businessName.trim() || "Sri Saraswathi Dental Clinic",
        googleReviewsUrl: googleReviewsUrl.trim() || DEFAULT_GOOGLE_REVIEWS_URL,
        writeReviewUrl: writeReviewUrl.trim(),
        placeId: placeId.trim(),
        overallRating: Number.isFinite(ratingNum) ? ratingNum : undefined,
        totalReviews: Number.isFinite(totalNum) ? totalNum : undefined,
        maxDisplayCount: Number.isFinite(maxNum) ? maxNum : 6,
      });

      applyConfigToInputs(res.config);
      notifySiteContentUpdated();
      toast.success("Google Reviews settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save Google Reviews settings");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncFromApi = async () => {
    setSyncingApi(true);
    try {
      const res = await api.syncGoogleReviews();
      if (res.reviews) {
        setReviews(res.reviews);
      }
      if (res.config) {
        applyConfigToInputs(res.config);
      }
      setStatus(res.status);
      notifySiteContentUpdated();
      toast.success(`Google Reviews synced (${res.importedCount ?? 0} imported)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google API synchronization failed");
    } finally {
      setSyncingApi(false);
    }
  };

  const openAddModal = () => {
    setEditingReview(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const openEditModal = (review: GoogleReviewItem) => {
    setEditingReview(review);
    setFormData({
      id: review.id,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      reviewDate: review.relativeTime || review.reviewDate || "Recent review",
      reviewUrl: review.reviewUrl || DEFAULT_GOOGLE_REVIEWS_URL,
      authorPhotoUrl: review.authorPhotoUrl || "",
      isVerified: review.isVerified !== false,
      published: review.published !== false,
    });
    setModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author.trim()) {
      toast.error("Reviewer name is required");
      return;
    }
    if (!formData.comment.trim()) {
      toast.error("Review comment text is required");
      return;
    }

    setSavingReview(true);
    try {
      if (editingReview) {
        const res = await api.updateGoogleReviewEntry(editingReview.id, {
          author: formData.author.trim(),
          rating: Number(formData.rating),
          comment: formData.comment.trim(),
          reviewDate: formData.reviewDate.trim(),
          reviewUrl: formData.reviewUrl.trim(),
          authorPhotoUrl: formData.authorPhotoUrl.trim(),
          isVerified: formData.isVerified,
          published: formData.published,
        });
        setReviews((prev) => prev.map((r) => (r.id === res.review.id ? res.review : r)));
        toast.success("Google review updated");
      } else {
        const res = await api.createGoogleReviewEntry({
          author: formData.author.trim(),
          rating: Number(formData.rating),
          comment: formData.comment.trim(),
          reviewDate: formData.reviewDate.trim(),
          reviewUrl: formData.reviewUrl.trim(),
          authorPhotoUrl: formData.authorPhotoUrl.trim(),
          isVerified: formData.isVerified,
          published: formData.published,
        });
        setReviews((prev) => [res.review, ...prev]);
        toast.success("Verified Google review added");
      }
      notifySiteContentUpdated();
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSavingReview(false);
    }
  };

  const handleTogglePublish = async (review: GoogleReviewItem) => {
    const nextPublished = !review.published;
    try {
      const res = await api.updateGoogleReviewEntry(review.id, { published: nextPublished });
      setReviews((prev) => prev.map((r) => (r.id === res.review.id ? res.review : r)));
      notifySiteContentUpdated();
      toast.success(nextPublished ? "Review visible on homepage" : "Review hidden from homepage");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle review visibility");
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("Are you sure you want to delete this Google review entry?")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteGoogleReviewEntry(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      notifySiteContentUpdated();
      toast.success("Google review removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveReview = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reviews.length) return;

    const reordered = [...reviews];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setReviews(reordered);
    try {
      const ids = reordered.map((r) => r.id);
      await api.reorderGoogleReviews(ids);
      notifySiteContentUpdated();
    } catch (err) {
      toast.error("Failed to save reorder");
      void loadData();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#073B43]">
              Google Reviews Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure Google Business Profile reviews display, verified patient ratings, and genuine feedback
            </p>
          </div>
        </div>

        {/* Top Operational Status Banner */}
        <Card className="border-[#073B43]/15 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                  apiConfigured
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-[#073B43]/10 text-[#073B43] border border-[#073B43]/20"
                }`}
              >
                {apiConfigured ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-[#0E8A5E]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#073B43] text-[15px]">
                    {apiConfigured
                      ? "Google Places API Connected"
                      : "Manual Verified Review Mode Active"}
                  </h3>
                  <Badge variant={apiConfigured ? "success" : "default"}>
                    {apiConfigured ? "Live API Sync" : "Verified Manual"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  {apiConfigured
                    ? "Automatic Google Places API cache is active. Official Google reviews and aggregate ratings are synchronized."
                    : "Official verified mode: Display authentic Google reviews from real patients with direct Google Business Profile links. When Google API keys are added in the future, API syncing activates seamlessly."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button onClick={openAddModal} className="bg-[#0E8A5E] hover:bg-[#073B43] text-white">
                <Plus className="mr-1.5 h-4 w-4" /> Add Verified Review
              </Button>
              {apiConfigured && (
                <Button
                  variant="outline"
                  onClick={() => void handleSyncFromApi()}
                  disabled={syncingApi}
                >
                  {syncingApi ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Sync API
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Two-Column Grid: Config Form & Reviews Table */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Homepage Display & Google Profile Settings */}
          <Card className="lg:col-span-5 border-[#073B43]/12 p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#073B43] mb-4 pb-2 border-b border-border/70">
              Display &amp; Google Profile Settings
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-[#FAF8F4] p-3.5">
                <div>
                  <p className="text-xs font-bold text-[#073B43]">Show Reviews on Homepage</p>
                  <p className="text-[11px] text-muted-foreground">
                    Toggles the &quot;What Our Patients Say&quot; section on the public homepage.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0E8A5E] peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                  Clinic Display Name
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Sri Saraswathi Dental Clinic"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                  Google Business Profile Link (Read All Reviews CTA)
                </label>
                <Input
                  type="url"
                  value={googleReviewsUrl}
                  onChange={(e) => setGoogleReviewsUrl(e.target.value)}
                  placeholder="https://share.google/Audp52vAIaRkaW1vL"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  The primary button &quot;Read All Google Reviews&quot; directs patients here.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                    Overall Rating (Stars)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={overallRating}
                    onChange={(e) => setOverallRating(e.target.value)}
                    placeholder="4.8"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                    Total Review Count
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={totalReviews}
                    onChange={(e) => setTotalReviews(e.target.value)}
                    placeholder="1100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                  Max Reviews on Homepage
                </label>
                <select
                  value={maxDisplayCount}
                  onChange={(e) => setMaxDisplayCount(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-[#073B43] focus:outline-none focus:ring-1 focus:ring-[#073B43]"
                >
                  <option value="3">3 reviews (1 row desktop)</option>
                  <option value="6">6 reviews (2 rows / full carousel)</option>
                  <option value="9">9 reviews</option>
                  <option value="12">12 reviews</option>
                  <option value="20">All published reviews</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                  Custom Write a Review Link (Optional)
                </label>
                <Input
                  type="url"
                  value={writeReviewUrl}
                  onChange={(e) => setWriteReviewUrl(e.target.value)}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                />
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Active target: <span className="font-mono">{computedWriteUrlPreview}</span>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full bg-[#073B43] hover:bg-[#1F6878] text-white"
                >
                  {savingConfig ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </form>
          </Card>

          {/* Right Column: Google Reviews Entries Management */}
          <Card className="lg:col-span-7 border-[#073B43]/12 p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#073B43]">
                  Google Reviews List ({reviews.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage display order, edit comments, show/hide, or verify genuine patient reviews.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#FFF9E6] px-3 py-1 text-xs font-bold text-[#073B43]">
                <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{overallRating}/5</span>
                <span className="font-medium text-[#707574]">({totalReviews} reviews)</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#073B43]/20 bg-[#FAF8F4] px-6 py-10 text-center">
                <p className="text-sm font-semibold text-[#073B43]">No reviews found</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Click &quot;Add Verified Review&quot; above to add your first authentic Google review.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className={`rounded-2xl border p-4 transition ${
                      review.published === false
                        ? "border-dashed border-border/70 bg-muted/30 opacity-70"
                        : "border-border/80 bg-[#FAF8F4]/60 hover:bg-[#FAF8F4]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {review.authorPhotoUrl ? (
                          <img
                            src={review.authorPhotoUrl}
                            alt={review.author}
                            className="h-8 w-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1F6878] text-white text-xs font-bold">
                            {review.author.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="truncate text-xs font-bold text-[#073B43]">
                            {review.author}
                          </p>
                          <p className="text-[10.5px] text-muted-foreground">
                            {review.relativeTime || review.reviewDate || "Verified Review"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {review.isVerified !== false && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                          </span>
                        )}
                        <Badge variant={review.published !== false ? "success" : "default"}>
                          {review.published !== false ? "Published" : "Hidden"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[#F59E0B]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating ? "fill-[#F59E0B]" : "text-slate-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-bold text-[#073B43]">
                        {review.rating}.0
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#15191B]/85 line-clamp-3">
                      &ldquo;{review.comment}&rdquo;
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveReview(index, "up")}
                          disabled={index === 0}
                          title="Move Up"
                          className="rounded-lg p-1 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveReview(index, "down")}
                          disabled={index === reviews.length - 1}
                          title="Move Down"
                          className="rounded-lg p-1 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {review.reviewUrl && (
                          <a
                            href={review.reviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#0E8A5E] hover:underline"
                          >
                            <span>Google Source</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(review)}
                          title={review.published !== false ? "Hide Review" : "Publish Review"}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          {review.published !== false ? (
                            <Eye className="h-3.5 w-3.5 text-[#0E8A5E]" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(review)}
                          title="Edit Review"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReview(review.id)}
                          disabled={deletingId === review.id}
                          title="Delete Review"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        >
                          {deletingId === review.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add / Edit Review Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReview ? "Edit Google Review" : "Add Verified Google Review"}
      >
        <form onSubmit={handleSaveReview} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#073B43]">
              Reviewer Name *
            </label>
            <Input
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="e.g. Kavitha R."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                Star Rating *
              </label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-[#073B43] focus:outline-none focus:ring-1 focus:ring-[#073B43]"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                <option value={3}>⭐⭐⭐ (3 Stars)</option>
                <option value={2}>⭐⭐ (2 Stars)</option>
                <option value={1}>⭐ (1 Star)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#073B43]">
                Review Date Label
              </label>
              <Input
                value={formData.reviewDate}
                onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                placeholder="e.g. 2 weeks ago"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#073B43]">
              Review Text / Feedback *
            </label>
            <TextArea
              required
              rows={4}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Paste the genuine feedback from the patient's Google review..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#073B43]">
              Google Review / Profile Source URL
            </label>
            <Input
              type="url"
              value={formData.reviewUrl}
              onChange={(e) => setFormData({ ...formData, reviewUrl: e.target.value })}
              placeholder="https://share.google/Audp52vAIaRkaW1vL"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#073B43]">
              Reviewer Photo URL (Optional)
            </label>
            <Input
              type="url"
              value={formData.authorPhotoUrl}
              onChange={(e) => setFormData({ ...formData, authorPhotoUrl: e.target.value })}
              placeholder="https://lh3.googleusercontent.com/..."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-[#FAF8F4] p-3">
            <span className="text-xs font-bold text-[#073B43]">Mark as Google Verified</span>
            <input
              type="checkbox"
              checked={formData.isVerified}
              onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#0E8A5E] focus:ring-[#0E8A5E]"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-[#FAF8F4] p-3">
            <span className="text-xs font-bold text-[#073B43]">Publish to Website</span>
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#0E8A5E] focus:ring-[#0E8A5E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingReview}
              className="bg-[#073B43] hover:bg-[#1F6878] text-white"
            >
              {savingReview && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editingReview ? "Save Changes" : "Add Review"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
