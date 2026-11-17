"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme-context";
import { DEFAULT_THEME_COLORS, type ThemeColors } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import {
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  Eye,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ColourDefinition {
  key: keyof ThemeColors;
  name: string;
  description: string;
  defaultHex: string;
}

const COLOUR_OPTIONS: ColourDefinition[] = [
  {
    key: "primary",
    name: "Primary Colour",
    description: "Main headings, badges, key brand elements, and active navigation links",
    defaultHex: DEFAULT_THEME_COLORS.primary,
  },
  {
    key: "secondary",
    name: "Secondary Colour",
    description: "Subtle backgrounds, secondary buttons, tags, and surface tints",
    defaultHex: DEFAULT_THEME_COLORS.secondary,
  },
  {
    key: "accent",
    name: "Accent Colour",
    description: "High-emphasis CTAs ('Book an appointment'), transformation badges, and buttons",
    defaultHex: DEFAULT_THEME_COLORS.accent,
  },
  {
    key: "background",
    name: "Background Colour",
    description: "Main body surface and section background tint",
    defaultHex: DEFAULT_THEME_COLORS.background,
  },
  {
    key: "text",
    name: "Text Colour",
    description: "Primary typography, paragraphs, subtitles, and standard dark ink",
    defaultHex: DEFAULT_THEME_COLORS.text,
  },
  {
    key: "header",
    name: "Header Colour",
    description: "Top fixed navigation bar background",
    defaultHex: DEFAULT_THEME_COLORS.header,
  },
  {
    key: "footer",
    name: "Footer Colour",
    description: "Clinic website footer background",
    defaultHex: DEFAULT_THEME_COLORS.footer,
  },
];

function isValidHex(hex: string): boolean {
  if (!hex || typeof hex !== "string") return false;
  const trimmed = hex.trim();
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed);
}

function normalizeHexInput(input: string): string {
  let val = input.trim();
  if (!val.startsWith("#") && /^[0-9A-Fa-f]{1,6}$/.test(val)) {
    val = `#${val}`;
  }
  return val.toUpperCase();
}

export function WebsiteColoursSettings() {
  const { savedColors, saveColors, resetToDefault, loading } = useTheme();

  // Local state for editing and immediate live preview
  const [currentColors, setCurrentColors] = useState<ThemeColors>(savedColors);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Sync state when savedColors change
  useEffect(() => {
    setCurrentColors(savedColors);
  }, [savedColors]);

  // Check if any colour is modified from saved
  const isDirty = (Object.keys(currentColors) as (keyof ThemeColors)[]).some(
    (key) => currentColors[key]?.toLowerCase() !== savedColors[key]?.toLowerCase()
  );

  // Validate all 7 colours
  const invalidFields = (Object.keys(currentColors) as (keyof ThemeColors)[]).filter(
    (key) => !isValidHex(currentColors[key])
  );
  const hasErrors = invalidFields.length > 0;

  const handleHexChange = (key: keyof ThemeColors, value: string) => {
    const formatted = normalizeHexInput(value);
    setCurrentColors((prev) => ({
      ...prev,
      [key]: formatted,
    }));
  };

  const handleColorPickerChange = (key: keyof ThemeColors, value: string) => {
    setCurrentColors((prev) => ({
      ...prev,
      [key]: value.toUpperCase(),
    }));
  };

  const handleSave = async () => {
    if (hasErrors) {
      toast.error("Please enter valid 3 or 6-digit HEX codes (e.g., #1F6878)");
      return;
    }

    setSaving(true);
    try {
      await saveColors(currentColors);
      toast.success("Website colours saved and applied successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save colours");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentColors(savedColors);
    toast("Changes discarded", { icon: "↩️" });
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("Restore original website default colours?")) return;

    setResetting(true);
    try {
      await resetToDefault();
      setCurrentColors(DEFAULT_THEME_COLORS);
      toast.success("Theme restored to original clinic default colours");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset colours");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-secondary-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1F6878]">Website Colours</h2>
            {isDirty ? (
              <Badge variant="warning">Unsaved Changes</Badge>
            ) : (
              <Badge variant="success">Saved to Website</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Customize the 7 core brand colours. The live preview updates instantly with no page refresh required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={saving || resetting || loading}
            title="Restore original clinic colours"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resetting ? "Resetting…" : "Reset to Default"}
          </Button>
        </div>
      </div>

      {/* Main Grid: Controls (Left) + Live Preview (Right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: 7 Colour Rows */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl border border-secondary-100 bg-card p-4 sm:p-5 divide-y divide-secondary-100">
            {COLOUR_OPTIONS.map((col) => {
              const hexVal = currentColors[col.key] || col.defaultHex;
              const valid = isValidHex(hexVal);
              const pickerId = `color-picker-${col.key}`;

              return (
                <div
                  key={col.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  {/* Left: Name and Description */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor={pickerId} className="text-sm font-semibold text-foreground cursor-pointer">
                        {col.name}
                      </label>
                      {hexVal.toUpperCase() === col.defaultHex.toUpperCase() && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-secondary-100 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">
                      {col.description}
                    </p>
                  </div>

                  {/* Right: Swatch, Picker, and HEX Input */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Native Clickable Colour Picker wrapped in styled preview button */}
                    <div className="relative group">
                      <input
                        id={pickerId}
                        type="color"
                        value={valid ? (hexVal.length === 4 ? `#${hexVal[1]}${hexVal[1]}${hexVal[2]}${hexVal[2]}${hexVal[3]}${hexVal[3]}` : hexVal) : col.defaultHex}
                        onChange={(e) => handleColorPickerChange(col.key, e.target.value)}
                        className="sr-only"
                        aria-label={`Select ${col.name}`}
                      />
                      <label
                        htmlFor={pickerId}
                        style={{ backgroundColor: valid ? hexVal : col.defaultHex }}
                        className="block h-9 w-9 rounded-lg border border-black/15 shadow-xs cursor-pointer transition-transform hover:scale-105 active:scale-95 ring-offset-2 ring-primary group-focus-within:ring-2"
                        title={`Click to pick ${col.name}`}
                      />
                    </div>

                    {/* Editable HEX Code Input */}
                    <div className="relative w-28 sm:w-32">
                      <input
                        type="text"
                        value={hexVal}
                        maxLength={7}
                        onChange={(e) => handleHexChange(col.key, e.target.value)}
                        placeholder="#1F6878"
                        className={`w-full rounded-lg border px-3 py-2 text-xs font-mono font-medium transition-colors focus:outline-none focus:ring-2 ${
                          valid
                            ? "border-secondary-200 bg-background text-foreground focus:border-[#1F6878] focus:ring-[#1F6878]/20"
                            : "border-red-500 bg-red-50/40 text-red-900 focus:border-red-500 focus:ring-red-500/20"
                        }`}
                        aria-invalid={!valid}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {valid ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              disabled={saving || resetting}
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={!isDirty || saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || hasErrors || !isDirty}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3.5 w-3.5 text-[#1F6878]" /> Live Website Preview
            </div>
            <span className="text-[11px] text-muted-foreground">
              {isDirty ? "Previewing Unsaved Changes" : "Matches Live Website"}
            </span>
          </div>

          {/* Mockup Card */}
          <div className="overflow-hidden rounded-2xl border border-secondary-200/90 shadow-lift transition-all">
            {/* 1. Header Preview */}
            <div
              style={{
                backgroundColor: currentColors.header || DEFAULT_THEME_COLORS.header,
              }}
              className="border-b border-black/10 px-4 py-3 transition-colors duration-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: currentColors.primary || DEFAULT_THEME_COLORS.primary,
                    color: "#FFFFFF",
                  }}
                  className="grid h-6 w-6 place-items-center rounded-lg text-xs font-bold shadow-xs"
                >
                  S
                </div>
                <div className="leading-none">
                  <span
                    style={{ color: currentColors.primary || DEFAULT_THEME_COLORS.primary }}
                    className="block text-xs font-bold tracking-tight"
                  >
                    Sri Saraswathi
                  </span>
                  <span className="text-[9px] text-muted-foreground">Dental Clinic</span>
                </div>
              </div>

              {/* Navigation items */}
              <div
                style={{ color: currentColors.primary || DEFAULT_THEME_COLORS.primary }}
                className="hidden sm:flex items-center gap-3 text-[11px] font-medium opacity-90"
              >
                <span className="font-bold underline underline-offset-4">Home</span>
                <span>Treatments</span>
                <span>Dentists</span>
                <span>Contact</span>
              </div>
            </div>

            {/* 2. Body Preview */}
            <div
              style={{
                backgroundColor: currentColors.background || DEFAULT_THEME_COLORS.background,
                color: currentColors.text || DEFAULT_THEME_COLORS.text,
              }}
              className="p-5 transition-colors duration-200 space-y-4"
            >
              {/* Eyebrow badge */}
              <div
                style={{
                  backgroundColor: currentColors.accent || DEFAULT_THEME_COLORS.accent,
                  color: "#FFFFFF",
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-xs"
              >
                <Sparkles className="h-3 w-3" /> Complete Dental Care
              </div>

              {/* Main Heading in Primary Colour */}
              <div>
                <h3
                  style={{ color: currentColors.primary || DEFAULT_THEME_COLORS.primary }}
                  className="text-lg font-bold leading-tight"
                >
                  Your Smile Deserves Expert Care.
                </h3>
                <p className="mt-1.5 text-xs opacity-85 leading-relaxed">
                  Compassionate care, modern treatments, and personalized smile transformations together under one roof in Erode.
                </p>
              </div>

              {/* Buttons Preview: Accent CTA + Secondary Action */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* Primary CTA (Accent Colour) */}
                <button
                  type="button"
                  style={{
                    backgroundColor: currentColors.accent || DEFAULT_THEME_COLORS.accent,
                    color: "#FFFFFF",
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-md transition-transform hover:scale-105"
                >
                  Book an Appointment <ArrowRight className="h-3 w-3" />
                </button>

                {/* Secondary Button (Secondary surface + Primary text) */}
                <button
                  type="button"
                  style={{
                    backgroundColor: currentColors.secondary || DEFAULT_THEME_COLORS.secondary,
                    color: currentColors.primary || DEFAULT_THEME_COLORS.primary,
                    borderColor: currentColors.primary || DEFAULT_THEME_COLORS.primary,
                  }}
                  className="inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-xs transition-transform hover:scale-105"
                >
                  Our Specialists
                </button>
              </div>

              {/* Small Service Card Preview */}
              <div
                style={{
                  borderColor: currentColors.secondary || DEFAULT_THEME_COLORS.secondary,
                }}
                className="rounded-xl border bg-white/70 p-3 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      backgroundColor: currentColors.secondary || DEFAULT_THEME_COLORS.secondary,
                      color: currentColors.primary || DEFAULT_THEME_COLORS.primary,
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4
                      style={{ color: currentColors.primary || DEFAULT_THEME_COLORS.primary }}
                      className="text-xs font-bold"
                    >
                      Smile Aligners & Implants
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Certified Orthodontic Care</p>
                  </div>
                </div>
                <span
                  style={{ color: currentColors.accent || DEFAULT_THEME_COLORS.accent }}
                  className="text-xs font-bold"
                >
                  4.8 ★
                </span>
              </div>
            </div>

            {/* 3. Footer Preview */}
            <div
              style={{
                backgroundColor: currentColors.footer || DEFAULT_THEME_COLORS.footer,
                color: "rgba(255, 255, 255, 0.85)",
              }}
              className="px-4 py-3 text-[11px] transition-colors duration-200 flex flex-wrap items-center justify-between gap-2 border-t border-white/10"
            >
              <span>© Sri Saraswathi Dental Clinic</span>
              <span className="opacity-75">Surampatti Four Rd, Erode</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Click <strong>Save Changes</strong> to apply these colours across all public pages, headers, buttons, and footers.
          </p>
        </div>
      </div>
    </div>
  );
}
