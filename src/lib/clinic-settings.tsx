import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export interface ClinicSettings {
  id?: number;
  clinicName: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  address: string;
  openingHours: string;
  logoUrl?: string;
  clinic_name?: string;
  whatsapp_number?: string;
  opening_hours?: string;
  logo_url?: string;
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: "Sri Saraswathi Dental Clinic",
  clinic_name: "Sri Saraswathi Dental Clinic",
  phone: "0424 427 2494",
  email: "info@srisaraswathidental.com",
  whatsappNumber: "919345743409",
  whatsapp_number: "919345743409",
  address: "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
  openingHours: "Mon–Sat: 9:00 AM – 8:45 PM · Sunday emergency only",
  opening_hours: "Mon–Sat: 9:00 AM – 8:45 PM · Sunday emergency only",
};

interface ClinicSettingsContextValue {
  settings: ClinicSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<ClinicSettings>) => Promise<void>;
}

const ClinicSettingsContext = createContext<ClinicSettingsContextValue>({
  settings: DEFAULT_CLINIC_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
  updateSettings: async () => {},
});

export function ClinicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_CLINIC_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await api.get<{ settings: any }>("/api/clinic-settings");
      if (data?.settings) {
        setSettings({
          id: data.settings.id,
          clinicName: data.settings.clinic_name || DEFAULT_CLINIC_SETTINGS.clinicName,
          clinic_name: data.settings.clinic_name || DEFAULT_CLINIC_SETTINGS.clinicName,
          phone: data.settings.phone || DEFAULT_CLINIC_SETTINGS.phone,
          email: data.settings.email || DEFAULT_CLINIC_SETTINGS.email,
          whatsappNumber: data.settings.whatsapp_number || DEFAULT_CLINIC_SETTINGS.whatsappNumber,
          whatsapp_number: data.settings.whatsapp_number || DEFAULT_CLINIC_SETTINGS.whatsappNumber,
          address: data.settings.address || DEFAULT_CLINIC_SETTINGS.address,
          openingHours: data.settings.opening_hours || DEFAULT_CLINIC_SETTINGS.openingHours,
          opening_hours: data.settings.opening_hours || DEFAULT_CLINIC_SETTINGS.openingHours,
          logoUrl: data.settings.logo_url || "",
          logo_url: data.settings.logo_url || "",
        });
      }
    } catch {
      // Keep existing settings if API is temporarily unavailable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<ClinicSettings>) => {
    const payload = {
      clinic_name: newSettings.clinicName,
      phone: newSettings.phone,
      email: newSettings.email,
      whatsapp_number: newSettings.whatsappNumber,
      address: newSettings.address,
      opening_hours: newSettings.openingHours,
      logo_url: newSettings.logoUrl,
    };
    await api.patch("/api/admin/clinic-settings", payload);
    await fetchSettings();
  };

  return (
    <ClinicSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
        updateSettings,
      }}
    >
      {children}
    </ClinicSettingsContext.Provider>
  );
}

export function useClinicSettings() {
  return useContext(ClinicSettingsContext);
}
