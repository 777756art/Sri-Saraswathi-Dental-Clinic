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
    if (user) {
      navigate(safeNext || (user.role === "admin" ? "/dashboard" : "/patient-portal"), { replace: true });
    }
  }, [user, safeNext, navigate]);

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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary-50/80 via-background to-background pb-20 pt-32 md:pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-primary-200/35 blur-[120px]" />
        <div className="absolute -left-24 top-24 h-[360px] w-[360px] rounded-full bg-accent-200/25 blur-[110px]" />
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
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
              Create your account.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Manage appointments, records and messages in one place.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}
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
