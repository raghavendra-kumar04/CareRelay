import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const login = useAuthStore((s) => s.login);

  const navigate = useNavigate();
  const location = useLocation();

  const validate = (): LoginErrors => {
    const next: LoginErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Enter a valid email address';
    }
    if (!password) {
      next.password = 'Password is required';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.email || validationErrors.password) {
      return;
    }

    try {
      await login({ email: email.trim(), password });
      toast.success('Welcome back');
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      const apiMessage = isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response?.data?.error?.message
        : undefined;
      const message = apiMessage ? apiMessage : 'Login failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-text-primary">Sign in to CareRelay</h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-text-primary">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.email && <p className="text-error text-sm">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-text-primary">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.password && <p className="text-error text-sm">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-input bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/register" className="text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
