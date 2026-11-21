import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});

  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const register = useAuthStore((s) => s.register);

  const navigate = useNavigate();

  const validate = (): RegisterErrors => {
    const next: RegisterErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      next.name = 'Name is required';
    } else if (trimmedName.length > 80) {
      next.name = 'Name must be at most 80 characters';
    }

    if (!trimmedEmail) {
      next.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Enter a valid email address';
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
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success('Account created');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiMessage = isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response?.data?.error?.message
        : undefined;
      const message = apiMessage ? apiMessage : 'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-text-primary">Create your account</h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium text-text-primary">
              Name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.name && <p className="text-error text-sm">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-text-primary">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.email && <p className="text-error text-sm">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-text-primary">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.password && <p className="text-error text-sm">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-text-primary">
              Confirm password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-input border border-border px-3 py-2 focus:border-primary focus:outline-none"
            />
            {errors.confirmPassword && <p className="text-error text-sm">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-input bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
