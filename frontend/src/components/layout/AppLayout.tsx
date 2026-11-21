import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Clock, LayoutDashboard, ListTodo, Sparkles } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import Navbar, { useFirstFamilyAppointmentsPath, useFirstFamilyTasksPath } from './Navbar';

function bottomNavClass({ isActive }: { isActive: boolean }): string {
  return `flex flex-col items-center gap-0.5 py-2 text-xs ${
    isActive ? 'text-primary' : 'text-text-secondary'
  }`;
}

export default function AppLayout() {
  useSocket();
  const tasksPath = useFirstFamilyTasksPath();
  const appointmentsPath = useFirstFamilyAppointmentsPath();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface md:hidden">
        <NavLink to="/dashboard" className={bottomNavClass}>
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to={tasksPath} className={bottomNavClass}>
          <ListTodo className="h-5 w-5" aria-hidden="true" />
          <span>Tasks</span>
        </NavLink>
        <NavLink to={appointmentsPath} className={bottomNavClass}>
          <Calendar className="h-5 w-5" aria-hidden="true" />
          <span>Visits</span>
        </NavLink>
        <NavLink to="/timeline" className={bottomNavClass}>
          <Clock className="h-5 w-5" aria-hidden="true" />
          <span>Timeline</span>
        </NavLink>
        <NavLink to="/summary" className={bottomNavClass}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span>Summary</span>
        </NavLink>
      </nav>
    </div>
  );
}
