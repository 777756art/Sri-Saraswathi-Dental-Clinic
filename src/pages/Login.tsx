import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { ApiError } from "@/lib/api";
import { clinicImages } from "@/lib/images";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = params.get("next");
  const safeNext = next && next.startsWith("/") ? next : null;

  useEffect(() => {
    if (user) {
      navigate(safeNext || (user.role === "admin" ? "/dashboard" : "/patient-portal"), { replace: true });
    }
  }, [user, safeNext, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const signedIn = await login(email.trim(), password);
      const destination = safeNext || (signedIn.role === "admin" ? "/dashboard" : "/patient-portal");
      toast.success(`Welcome back, ${signedIn.firstName}`);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F2EB] pb-20 pt-32 md:pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#E4F0F2]/80 blur-[120px]" />
        <div className="absolute -right-24 top-24 h-[360px] w-[360px] rounded-full bg-[#E4F0F2]/60 blur-[110px]" />
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-b" />
      </div>

      <div className="container-x relative flex justify-center">
        <div className="w-full max-w-md">
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
              Welcome back.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Sign in to your patient portal or clinic dashboard.
            </p>

            {safeNext === "/booking" && (
              <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-primary-800">
                Sign in to finish booking your appointment. New patient?{" "}
                <Link
                  to={`/auth/register?next=${encodeURIComponent(safeNext)}`}
                  className="font-semibold underline underline-offset-2"
                >
                  Create an account
                </Link>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <div className="flex justify-end text-[13px]">
                <Link to="/contact" className="font-medium text-primary-700 hover:text-primary-800">
                  Need help signing in?
                </Link>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading}>
                {!loading && <LogIn className="h-4 w-4" />}
                Sign in
              </Button>
            </form>

            <p className="mt-6 border-t border-border/70 pt-5 text-center text-[13px] text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                to={safeNext ? `/auth/register?next=${encodeURIComponent(safeNext)}` : "/auth/register"}
                className="font-medium text-primary-700 hover:text-primary-800"
              >
                Create one
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Sign-in is for registered patients and clinic staff. Contact the clinic if you need help.
          </p>
        </div>
      </div>
    </main>
  );
}
