import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

const DEMO_PERSONAS = [
  {
    name: 'Riya Rao (Admin)',
    email: 'riya.rao@carerelay.demo',
    location: 'Bangalore',
    color: '#5C8A6E',
  },
  {
    name: 'Arjun Rao (Member)',
    email: 'arjun.rao@carerelay.demo',
    location: 'Hyderabad',
    color: '#D4830A',
  },
  {
    name: 'Priya Rao (Member)',
    email: 'priya.rao@carerelay.demo',
    location: 'Pune',
    color: '#2E7D52',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const login = useAuthStore((s) => s.login);

  const navigate = useNavigate();
  const location = useLocation();

  const validate = (): LoginErrors => {
    const next: LoginErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Please enter a valid email address';
    }
    if (!password) {
      next.password = 'Password is required';
    }
    return next;
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    try {
      await login({ email: loginEmail, password: loginPass });
      toast.success('Welcome back to CareRelay');
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      const apiMessage = isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response?.data?.error?.message
        : undefined;
      toast.error(apiMessage || 'Sign in failed. Please verify credentials.');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.email || validationErrors.password) return;
    await executeLogin(email.trim(), password);
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    await executeLogin(demoEmail, 'Demo@1234');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background px-4 py-8">
      {/* Top Header */}
      <div className="mx-auto w-full max-w-md flex items-center justify-between pb-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-sm transition group-hover:bg-primary-dark">
            C
          </span>
          <span className="text-xl font-bold tracking-tight text-primary">CareRelay</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-7 sm:p-9 shadow-card">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
            <span>Family Care Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign in to your hub</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Stay coordinated with your family in real time.
          </p>
        </div>

        {/* Quick Demo Sign-In Box for Judges / Evaluators */}
        <div className="mb-6 rounded-card border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Demo Personas</span>
            </span>
            <span className="text-[10px] text-text-secondary font-mono">Password: Demo@1234</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.email}
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleQuickDemo(p.email)}
                className="flex flex-col items-start rounded-md border border-border/80 bg-surface p-2 text-left hover:border-primary hover:bg-background transition disabled:opacity-60"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span
                    style={{ backgroundColor: p.color }}
                    className="h-2 w-2 rounded-full shrink-0"
                  />
                  <span className="text-[11px] font-semibold text-text-primary truncate">
                    {p.name.split(' ')[0]}
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary">{p.location}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-10 pr-3.5 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                  errors.email ? 'border-error' : 'border-border/80'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-10 pr-10 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                  errors.password ? 'border-error' : 'border-border/80'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-text-secondary/60 hover:text-text-primary transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-error">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-xs text-text-secondary">
            New to CareRelay?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create a family workspace
            </Link>
          </p>
        </div>
      </div>

      {/* Trust reassurance footer */}
      <div className="mx-auto mt-6 flex items-center gap-6 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Family data isolation</span>
        </span>
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          <span>Role-based access</span>
        </span>
      </div>
    </div>
  );
}
