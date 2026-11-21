import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getApiErrorCode, getApiErrorMessage, joinByToken } from '../lib/familyApi';
import type { JoinResult } from '../types';

type JoinStatus = 'joining' | 'success' | 'error';

const FALLBACK_ERROR = 'We could not join this family. Please try again.';

export default function InvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [status, setStatus] = useState<JoinStatus>('joining');
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(FALLBACK_ERROR);

  const joinStarted = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending redirect when the page unmounts.
  useEffect(() => {
    return () => {
      if (redirectTimer.current !== null) clearTimeout(redirectTimer.current);
    };
  }, []);

  // Join once per mount; the ref guards against StrictMode double-invoking effects.
  useEffect(() => {
    if (!isAuthenticated || joinStarted.current) return;
    joinStarted.current = true;

    joinByToken(token)
      .then((result) => {
        setJoined(result);
        setStatus('success');
        toast.success('You joined the family');
        redirectTimer.current = setTimeout(() => {
          navigate('/settings', { replace: true });
        }, 1500);
      })
      .catch((err: unknown) => {
        setErrorCode(getApiErrorCode(err));
        setErrorMessage(getApiErrorMessage(err, FALLBACK_ERROR));
        setStatus('error');
      });
  }, [isAuthenticated, token, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let content: ReactNode;

  if (status === 'joining') {
    content = (
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-primary" />
        <p className="text-text-secondary">Joining family...</p>
      </div>
    );
  } else if (status === 'success') {
    content = (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-text-primary">Welcome to {joined?.family.name}</h1>
        <p className="text-text-secondary">You joined the family. Redirecting to settings...</p>
        <Link to="/settings" replace className="inline-block text-primary hover:underline">
          Go to settings
        </Link>
      </div>
    );
  } else {
    let title = 'Could not join family';
    let body = errorMessage;
    let settingsLink = false;

    if (errorCode === 'INVITE_EXPIRED') {
      title = 'This invite has expired';
      body = 'Ask the family admin for a new invite link.';
    } else if (errorCode === 'INVITE_INVALID') {
      title = 'This invite link is not valid';
      body = 'Check the link, or ask the family admin for a new one.';
    } else if (errorCode === 'ALREADY_MEMBER') {
      title = 'You are already a member';
      body = 'You already belong to this family.';
      settingsLink = true;
    }

    content = (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-error">{title}</h1>
        <p className="text-text-secondary">{body}</p>
        <div className="flex flex-wrap gap-4">
          {settingsLink && (
            <Link to="/settings" className="text-primary hover:underline">
              Go to settings
            </Link>
          )}
          <Link to="/dashboard" className="text-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-card">{content}</div>
    </div>
  );
}
