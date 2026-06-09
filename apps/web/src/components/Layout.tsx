import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Gauge,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Tags,
  Users,
} from 'lucide-react';
import { Role, ROLE_LABELS } from '@desk2desk/shared';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { BrandLockup } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Inbox;
  end?: boolean;
}

interface NavSection {
  heading: string;
  roles?: Role[];
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Support',
    items: [
      {
        to: '/dashboard',
        label: 'Support Dashboard',
        icon: LayoutDashboard,
      },
      { to: '/history', label: 'Support History', icon: History },
      { to: '/requests', label: 'My Requests', icon: Inbox, end: true },
      { to: '/requests/new', label: 'New Request', icon: PlusCircle },
    ],
  },
  {
    heading: 'Administration',
    roles: [Role.ADMIN],
    items: [
      { to: '/admin/stats', label: 'Statistics', icon: BarChart3 },
      { to: '/admin/workload', label: 'Workload', icon: Gauge },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
    ],
  },
];

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isSupportPerson = !!user?.isProvider;

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="sidebar-graphics sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
        <div className="flex h-16 items-center border-b border-border/70 bg-card/70 px-5 backdrop-blur-sm">
          <BrandLockup />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {SECTIONS.map((section) => {
            if (section.roles && (!user || !section.roles.includes(user.role)))
              return null;
            const items = section.items.filter((item) => {
              // Provider-only items are hidden from plain requesters.
              const providerOnly =
                item.to === '/dashboard' || item.to === '/history';
              if (providerOnly && !isSupportPerson) return false;
              return true;
            });
            if (items.length === 0) return null;
            return (
              <div key={section.heading}>
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.heading}
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-end border-b bg-card px-8">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">
                {user?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : ''} ·{' '}
                {user?.department?.name ?? 'No department'}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(user?.name)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
