import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

const tab = 'px-3 py-2 text-sm border-b-2 -mb-px transition-colors';
const tabActive = 'border-amber text-amber';
const tabIdle = 'border-transparent text-muted hover:text-ink';

export function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="border-b border-steel px-4 sm:px-8 overflow-x-auto">
        <nav className="flex gap-1 whitespace-nowrap">
          <NavLink to="/admin" end className={({ isActive }) => `${tab} ${isActive ? tabActive : tabIdle}`}>
            {t('admin.usersTitle')}
          </NavLink>
          <NavLink to="/admin/form-builder" className={({ isActive }) => `${tab} ${isActive ? tabActive : tabIdle}`}>
            {t('nav.formBuilder')}
          </NavLink>
          <NavLink to="/admin/company" className={({ isActive }) => `${tab} ${isActive ? tabActive : tabIdle}`}>
            {t('nav.company')}
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
