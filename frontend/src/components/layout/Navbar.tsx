import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyFamilies } from '../../lib/familyApi';
import { useAuthStore } from '../../store/authStore';
import RealTimeIndicator from './RealTimeIndicator';

export function useFirstFamilyTasksPath(): string {
  const { data } = useQuery({ queryKey: ['families', 'mine'], queryFn: getMyFamilies });
  const stored = localStorage.getItem('activeFamilyId');
  const families = data?.families;
  if (stored && families?.some((f) => f.family._id === stored)) {
    return `/families/${stored}/tasks`;
  }
  if (families && families.length > 0) {
    return `/families/${families[0].family._id}/tasks`;
  }
  return '/settings';
}

export function useFirstFamilyAppointmentsPath(): string {
  const { data } = useQuery({ queryKey: ['families', 'mine'], queryFn: getMyFamilies });
  const stored = localStorage.getItem('activeFamilyId');
  const families = data?.families;
  if (stored && families?.some((f) => f.family._id === stored)) {
    return `/families/${stored}/appointments`;
  }
  if (families && families.length > 0) {
    return `/families/${families[0].family._id}/appointments`;
  }
  return '/settings';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-text-primary';
}

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const tasksPath = useFirstFamilyTasksPath();
  const appointmentsPath = useFirstFamilyAppointmentsPath();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [menuOpen]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const fullName = user?.name ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  const avatarStyle: CSSProperties = { backgroundColor: user?.avatarColor };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-sm font-bold text-white">
            C
          </span>
          <span className="text-primary font-semibold">CareRelay</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to={tasksPath} className={navLinkClass}>
            Tasks
          </NavLink>
          <NavLink to={appointmentsPath} className={navLinkClass}>
            Appointments
          </NavLink>
          <NavLink to="/timeline" className={navLinkClass}>
            Timeline
          </NavLink>
          <NavLink to="/summary" className={navLinkClass}>
            Summary
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
        </nav>

        <div className="flex items-center gap-4">
          <RealTimeIndicator />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-pill px-1 py-1"
            >
              <span
                style={avatarStyle}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              >
                {getInitials(fullName)}
              </span>
              <span className="hidden text-sm text-text-primary sm:inline">{firstName}</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-card border border-border bg-surface shadow-card p-2"
              >
                <div className="px-2 py-1">
                  <p className="text-sm font-medium text-text-primary">{fullName}</p>
                  <p className="truncate text-xs text-text-secondary">{user?.email ?? ''}</p>
                </div>
                <div className="my-2 border-t border-border" />
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded px-2 py-1.5 text-sm text-text-primary hover:bg-background"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-error hover:bg-background"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
