import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-sm">
              C
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-primary">CareRelay</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition shadow-sm"
              >
                <span>Dashboard ({user?.name?.split(' ')[0]})</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-input border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-pill border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
            <Heart className="h-3.5 w-3.5 fill-primary" />
            <span>Family Care Coordination Platform</span>
          </div>

          <h1 className="max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-tight">
            Care doesn't stop when <span className="text-primary">families live apart.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed">
            The shared operating system for adult children managing an elderly parent's care across cities.
            No more lost WhatsApp chats, missed refills, or "I thought you handled it."
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-input bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary-dark transition shadow-md"
              >
                <span>Open Family Hub</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-input bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary-dark transition shadow-md"
                >
                  <span>Create Family Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="rounded-input border border-border bg-surface px-6 py-3 text-base font-medium text-text-primary hover:bg-background transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Quick Demo Credentials Box */}
          <div className="mt-8 rounded-card border border-primary/20 bg-primary/5 p-4 text-xs text-text-secondary max-w-md w-full text-left">
            <div className="font-semibold text-primary mb-1 flex items-center justify-between">
              <span>Demo Family Account:</span>
              <span className="font-normal text-[11px] text-text-secondary">Password: Demo@1234</span>
            </div>
            <div className="flex flex-col gap-0.5 text-text-primary font-mono text-[11px]">
              <div>• riya.rao@carerelay.demo (Admin - Bangalore)</div>
              <div>• arjun.rao@carerelay.demo (Member - Hyderabad)</div>
              <div>• priya.rao@carerelay.demo (Member - Pune)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Feature: The 10-Second Family Snapshot */}
      <section className="py-16 sm:py-20 border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              The 10-Second Family Snapshot
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              A dashboard designed for peace of mind. Answers the 5 critical care questions without scrolling.
            </p>
          </div>

          <div className="rounded-card border border-border bg-surface p-6 sm:p-8 shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-border">
              <div className="flex items-center gap-3 p-4 rounded-card bg-success/5 border border-success/20">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div>
                  <div className="text-2xl font-bold text-success">12</div>
                  <div className="text-xs text-text-secondary">What happened recently</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-card bg-primary/5 border border-primary/20">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-primary">5</div>
                  <div className="text-xs text-text-secondary">What is currently pending</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-card bg-error/5 border border-error/20">
                <Shield className="h-8 w-8 text-error" />
                <div>
                  <div className="text-2xl font-bold text-error">1</div>
                  <div className="text-xs text-text-secondary">What needs urgent attention</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Who is Responsible
                </h3>
                <div className="rounded-card border border-border bg-background p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text-primary">Insulin Refill (Lantus)</span>
                    <span className="block text-text-secondary">Due in 2 days</span>
                  </div>
                  <span className="rounded-pill bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    Arjun Rao
                  </span>
                </div>
                <div className="rounded-card border border-border bg-background p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text-primary">Renew Health Insurance</span>
                    <span className="block text-error font-medium">Overdue</span>
                  </div>
                  <span className="rounded-pill bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    Riya Rao
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  What is Happening Next
                </h3>
                <div className="rounded-card border border-border bg-background p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text-primary">Cardiology Follow-up</span>
                    <span className="block text-text-secondary">Dr. Suresh Reddy • Saturday 10:00 AM</span>
                  </div>
                  <span className="rounded-pill bg-secondary/10 px-2.5 py-1 text-text-secondary">
                    Guntur Heart Centre
                  </span>
                </div>
                <div className="rounded-card border border-border bg-background p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text-primary">HbA1c & Fasting Sugar</span>
                    <span className="block text-text-secondary">Sri Lab Diagnostics</span>
                  </div>
                  <span className="rounded-pill bg-secondary/10 px-2.5 py-1 text-text-secondary">
                    Priya Rao
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Differentiating Capabilities */}
      <section className="py-16 sm:py-20 border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Care Continuity Through Shared Responsibility
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Engineered specifically for the realities of multi-city Indian families caring for elderly parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-card border border-border bg-background p-6 shadow-card flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                1. Responsibility First
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Every appointment, task, and refill has an assigned family member, status, and mandatory completion note. No ambiguity, zero blame culture.
              </p>
            </div>

            <div className="rounded-card border border-border bg-background p-6 shadow-card flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                2. Real-Time Synchronisation
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Powered by Socket.IO rooms. When Arjun in Hyderabad marks the insulin collected, Riya in Bangalore and Priya in Pune see the update in less than a second.
              </p>
            </div>

            <div className="rounded-card border border-border bg-background p-6 shadow-card flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                3. AI Care Summaries
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Gemini API compiles chronological activity records into a plain-language family briefing with verified source records and clinical safety guardrails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Realistic Family Scenario */}
      <section className="py-16 sm:py-20 border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-card border border-border bg-surface p-8 shadow-card flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Real-World Coordination
              </span>
              <h3 className="text-2xl font-bold text-text-primary">
                Managing Care for Venkateswara Rao (72) in Guntur
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Living with diabetes and hypertension, his care is jointly stewarded by his children across three cities.
                CareRelay ensures every hospital consultation, lab test, and prescription refill is tracked with complete transparency.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Bangalore • Appointments
                </span>
                <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Hyderabad • Pharmacy & Refills
                </span>
                <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Pune • Reports & Monitoring
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-3 sm:w-72 w-full">
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="rounded-input bg-primary px-5 py-3 text-center text-sm font-medium text-white hover:bg-primary-dark transition shadow-sm"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Caring Together'}
              </Link>
              <Link
                to="/login"
                className="rounded-input border border-border text-center px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-background transition"
              >
                Sign In with Demo Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface py-8 text-center text-xs text-text-secondary">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">CareRelay</span>
            <span>• ACE Builder Hackathon Problem Statement 4</span>
          </div>
          <p className="text-[11px] max-w-md text-text-secondary">
            CareRelay is an organisational coordination tool. It does not provide medical diagnoses, treatment advice, or replace qualified medical professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
