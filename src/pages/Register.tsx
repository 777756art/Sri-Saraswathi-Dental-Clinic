import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { ApiError } from "@/lib/api";
import { clinicImages } from "@/lib/images";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    terms: false,
  });

  const next = params.get("next");
  const safeNext = next && next.startsWith("/") ? next : null;

  useEffect(() => {
    const urlError = params.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [params]);

  useEffect(() => {
    if (user) {
      navigate(safeNext || (user.role === "admin" ? "/dashboard" : "/patient-portal"), { replace: true });
    }
  }, [user, safeNext, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const targetNext = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
    try {
      const res = await fetch(`/api/auth/google/url${targetNext}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error) {
        setError(data.error);
        setGoogleLoading(false);
        return;
      }
    } catch {
      // Fallback to direct navigation
    }
    window.location.href = `/api/auth/google${targetNext}`;
  };

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.terms) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }

    setLoading(true);
    try {
      const created = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      toast.success(`Welcome, ${created.firstName}!`);
      navigate(safeNext || "/patient-portal", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F2EB] pb-20 pt-32 md:pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-[#E4F0F2]/80 blur-[120px]" />
        <div className="absolute -left-24 top-24 h-[360px] w-[360px] rounded-full bg-[#E4F0F2]/60 blur-[110px]" />
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-b" />
      </div>

      <div className="container-x relative flex justify-center">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src={clinicImages.logoMark}
                alt=""
                aria-hidden="true"
                width={72}
                height={48}
                decoding="async"
                className="h-10 w-auto max-w-[90px] object-contain"
              />
              <span className="font-display text-lg font-medium tracking-tight text-foreground sm:text-xl">
                Sri Saraswathi Dental Clinic
              </span>
            </Link>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-7 shadow-lift md:p-9">
            <h1 className="font-display text-3xl font-medium tracking-tight text-[#1F6878]">
              Create your account.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Manage appointments, records and messages in one place.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] leading-relaxed text-destructive">
                {error}
              </div>
            )}

            {/* Official Google OAuth Sign-Up */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              aria-label="Continue with Google"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/90 bg-white px-5 py-3 text-[14px] font-medium text-foreground shadow-xs transition-all hover:border-[#1F6878]/50 hover:bg-[#F5F2EB]/40 hover:shadow-soft active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1F6878]/30"
            >
              {googleLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="font-medium text-foreground tracking-tight">Continue with Google</span>
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-border/80" />
              <span className="absolute bg-card px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Or register with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First name"
                  required
                  placeholder="Priya"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
                <Input
                  label="Last name"
                  required
                  placeholder="Raman"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </div>
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="priya@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="98765 43210"
                helperText="We send appointment updates to this WhatsApp number."
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-[39px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  checked={form.terms}
                  onChange={(e) => update("terms", e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="font-medium text-primary-700 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="font-medium text-primary-700 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading}>
                {!loading && <UserPlus className="h-4 w-4" />}
                Create account
              </Button>
            </form>

            <p className="mt-6 border-t border-border/70 pt-5 text-center text-[13px] text-muted-foreground">
              Already have an account?{" "}
              <Link
                to={safeNext ? `/auth/login?next=${encodeURIComponent(safeNext)}` : "/auth/login"}
                className="font-medium text-primary-700 hover:text-primary-800"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
