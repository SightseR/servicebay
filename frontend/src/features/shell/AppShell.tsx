import { LayoutDashboard, LogOut, Settings2, Wrench } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Logo } from '../../components/Logo';
import { logout } from '../auth/authSlice';

const navItem = 'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors';
const navActive = 'bg-panel-alt text-amber';
const navIdle = 'text-muted hover:text-ink hover:bg-panel-alt/60';

export function AppShell() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-steel bg-panel flex flex-col">
        <div className="px-4 py-5 border-b border-steel"><Logo /></div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
            <LayoutDashboard className="h-4 w-4" /> Records
          </NavLink>
          <NavLink to="/inspect" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
            <Wrench className="h-4 w-4" /> New inspection
          </NavLink>
          {user?.role === 'MANAGER' && (
            <NavLink to="/admin" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
              <Settings2 className="h-4 w-4" /> Admin
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-steel">
          <div className="px-3 py-2">
            <p className="text-sm text-ink truncate">{user?.displayName}</p>
            <p className="text-xs text-muted">{user?.role === 'MANAGER' ? 'Manager' : 'Admin'}</p>
          </div>
          <button onClick={() => dispatch(logout())} className={`${navItem} ${navIdle} w-full`}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
