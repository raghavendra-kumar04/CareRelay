import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, Users } from 'lucide-react';
import { getMyFamilies } from '../../lib/familyApi';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';

export function useFirstFamilyTasksPath(): string {
  const activeFamilyId = useFamilyStore.getState().activeFamilyId;
  if (activeFamilyId) return `/families/${activeFamilyId}/tasks`;
  const stored = typeof window !== 'undefined' ? localStorage.getItem('activeFamilyId') : null;
  if (stored) return `/families/${stored}/tasks`;
  return '/settings';
}

export function useFirstFamilyAppointmentsPath(): string {
  const activeFamilyId = useFamilyStore.getState().activeFamilyId;
  if (activeFamilyId) return `/families/${activeFamilyId}/appointments`;
  const stored = typeof window !== 'undefined' ? localStorage.getItem('activeFamilyId') : null;
  if (stored) return `/families/${stored}/appointments`;
  return '/settings';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return (first + last).toUpperCase();
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 ${
    isActive
      ? 'bg-primary text-white shadow-xs ring-1 ring-primary/20'
      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
  }`;
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  const { data: myFamiliesData } = useQuery({
    queryKey: ['families', 'mine'],
    queryFn: getMyFamilies,
  });

  const families = myFamiliesData?.families ?? [];

  // Sync active family
  useEffect(() => {
    if (families.length > 0) {
      if (!activeFamilyId || !families.some((f) => f.family._id === activeFamilyId)) {
        const stored = localStorage.getItem('activeFamilyId');
        const matched = families.find((f) => f.family._id === stored);
        const resolvedId = matched ? matched.family._id : families[0].family._id;
        setActiveFamilyId(resolvedId);
      }
    }
  }, [families, activeFamilyId, setActiveFamilyId]);

  const activeFamily = families.find((f) => f.family._id === activeFamilyId) || families[0];
  const fid = activeFamily?.family._id || activeFamilyId || '';

  const tasksPath = fid ? `/families/${fid}/tasks` : '/settings';
  const appointmentsPath = fid ? `/families/${fid}/appointments` : '/settings';

  const [menuOpen, setMenuOpen] = useState(false);
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const familyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setFamilyMenuOpen(false);
      }
    };
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (familyMenuRef.current && !familyMenuRef.current.contains(e.target as Node)) {
        setFamilyMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleSelectFamily = (newFid: string) => {
    setActiveFamilyId(newFid);
    setFamilyMenuOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['family', newFid] });

    // If currently on a family-scoped page, update route
    if (location.pathname.includes('/tasks')) {
      navigate(`/families/${newFid}/tasks`);
    } else if (location.pathname.includes('/appointments')) {
      navigate(`/families/${newFid}/appointments`);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const fullName = user?.name ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  const avatarStyle: CSSProperties = { backgroundColor: user?.avatarColor };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-xs">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        {/* Left: Brand Logo & Global Family Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
            <img
              src="/logo-icon.png"
              alt="CareRelay"
              className="h-8 w-auto object-contain transition group-hover:scale-105"
            />
            <span className="hidden sm:inline text-lg font-bold tracking-tight text-text-primary">
              Care<span className="text-primary">Relay</span>
            </span>
          </Link>

          {/* Family Switcher Dropdown */}
          {families.length > 0 && (
            <div className="relative" ref={familyMenuRef}>
              <button
                type="button"
                onClick={() => setFamilyMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/80 hover:bg-background px-2.5 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary/50 shadow-xs cursor-pointer"
                title="Switch active family workspace"
              >
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate">
                  {activeFamily?.family.name || 'Select Family'}
                </span>
                <span className="hidden sm:inline rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary uppercase">
                  {activeFamily?.role || 'Member'}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-text-secondary transition-transform ${
                    familyMenuOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {familyMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-card z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Family Workspaces ({families.length})
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {families.map((f) => {
                      const isCurrent = f.family._id === fid;
                      return (
                        <button
                          key={f.family._id}
                          type="button"
                          onClick={() => handleSelectFamily(f.family._id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition cursor-pointer ${
                            isCurrent
                              ? 'bg-primary/10 font-bold text-primary'
                              : 'text-text-primary hover:bg-background'
                          }`}
                        >
                          <div className="truncate">
                            <p className="truncate font-medium">{f.family.name}</p>
                            <p className="text-[10px] text-text-secondary capitalize">{f.role} role</p>
                          </div>
                          {isCurrent && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="my-1 border-t border-border" />
                  <Link
                    to="/settings"
                    onClick={() => setFamilyMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create or Manage Families</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Main Navigation */}
        <nav className="hidden items-center gap-1 md:flex rounded-xl border border-border/70 bg-background/80 p-1 shadow-2xs">
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

        {/* Right: User Profile Menu */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary/20 transition cursor-pointer"
            >
              <span
                style={avatarStyle}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-xs"
              >
                {getInitials(fullName)}
              </span>
              <span className="hidden text-sm font-medium text-text-primary sm:inline">{firstName}</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-card border border-border bg-surface shadow-card p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
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
                  Settings & Families
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-error hover:bg-background cursor-pointer"
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
