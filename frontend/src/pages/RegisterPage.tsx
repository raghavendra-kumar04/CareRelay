import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const register = useAuthStore((s) => s.register);

  const navigate = useNavigate();

  const validate = (): RegisterErrors => {
    const next: RegisterErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      next.name = 'Full name is required';
    } else if (trimmedName.length > 80) {
      next.name = 'Name must be at most 80 characters';
    }

    if (!trimmedEmail) {
      next.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Please enter a valid email address';
    }

    if (!password) {
      next.password = 'Password is required';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    } else if (password.length > 72) {
      next.password = 'Password must be at most 72 characters';
    }

    if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match';
    }

    return next;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success('Account created successfully! Welcome to CareRelay.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiMessage = isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response?.data?.error?.message
        : undefined;
      toast.error(apiMessage || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background px-4 py-8">
      {/* Top Header */}
      <div className="mx-auto w-full max-w-md flex items-center justify-between pb-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo-icon.png" alt="CareRelay" className="h-8 w-auto object-contain transition group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight text-text-primary">
            Care<span className="text-primary">Relay</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Main Registration Card */}
      <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-7 sm:p-9 shadow-card">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
            <span>Family Care Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create family account</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Join your family care circle and stay coordinated.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Riya Rao"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-10 pr-3.5 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                  errors.name ? 'border-error' : 'border-border/80'
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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

          <div>
            <label htmlFor="register-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary/60" />
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-10 pr-10 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                  errors.confirmPassword ? 'border-error' : 'border-border/80'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3 text-text-secondary/60 hover:text-text-primary transition"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-error">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            <span>{isSubmitting ? 'Creating workspace...' : 'Create Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-xs text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Trust reassurance footer */}
      <div className="mx-auto mt-6 flex items-center gap-6 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Encrypted data & JWT auth</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>Multi-city family coordination</span>
        </span>
      </div>
    </div>
  );
}
