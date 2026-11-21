import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
      <p className="text-text-secondary">Welcome, {user?.name}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-input bg-primary px-4 py-2 text-white hover:bg-primary-dark"
      >
        Log out
      </button>
    </div>
  );
}
