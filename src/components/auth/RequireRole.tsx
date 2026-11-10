import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/use-auth";
import type { Role } from "@/lib/api";

export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
          <span className="text-sm font-medium text-muted-foreground">Checking your session</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/dashboard" : "/patient-portal"} replace />;
  }

  return <Outlet />;
}
