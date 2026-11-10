import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-provider";
import { ClinicSettingsProvider } from "@/lib/clinic-settings";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClinicSettingsProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </ClinicSettingsProvider>
    </AuthProvider>
  );
}
