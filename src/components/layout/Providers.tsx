import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-provider";
import { ClinicSettingsProvider } from "@/lib/clinic-settings";
import { ThemeProvider } from "@/lib/theme-context";
import { ChatbotProvider } from "@/components/chatbot/ChatbotContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClinicSettingsProvider>
        <ThemeProvider>
          <ChatbotProvider>
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
          </ChatbotProvider>
        </ThemeProvider>
      </ClinicSettingsProvider>
    </AuthProvider>
  );
}
