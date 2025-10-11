// Main Layout with Sidebar
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Shield,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { formatAddress } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Payroll Runs', href: '/payrolls', icon: Receipt },
];

export default function Layout({ children }: LayoutProps) {
  const { user, currentOrganization, organizations, logout, switchOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchOrganization = (orgId: string) => {
    switchOrganization(orgId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center">
            <Shield className="size-8 text-blue-600" />
            <span className="ml-2 text-blue-600">Safe Payroll</span>
          </div>
        </div>

        {/* Organization Selector */}
        <div className="p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="size-4 flex-shrink-0" />
                  <span className="truncate">{currentOrganization?.name || 'No Organization'}</span>
                </div>
                <ChevronDown className="size-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  className={org.id === currentOrganization?.id ? 'bg-accent' : ''}
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  <Icon className="mr-2 size-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="truncate">{formatAddress(user?.walletAddress || '')}</p>
              <p className="text-muted-foreground">{currentOrganization?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 size-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
