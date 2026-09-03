import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Scissors, 
  Recycle, 
  Wrench, 
  Users, 
  BellRing, 
  FileBarChart,
  Calendar,
  Building2,
  Clock,
  UserCircle
} from 'lucide-react';
import { useAppContext } from '../shared/context/AppContext';
import DemoBadge from '../shared/components/DemoBadge';

const navigation = [
  { name: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Fabric Quality', href: '/c1', icon: Scissors },
  { name: 'Fabric Waste', href: '/c2', icon: Recycle },
  { name: 'Predictive Maintenance', href: '/c3', icon: Wrench },
  { name: 'Workforce', href: '/c4', icon: Users },
  { name: 'Alerts & Actions', href: '/alerts', icon: BellRing },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
];

export default function AppLayout() {
  const { 
    outputMode, 
    userRole,
    openAlertCount,
    resetDemoState
  } = useAppContext();

  const location = useLocation();

  // Helper to determine if a route is active
  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Derive route-specific role display without mutating global AppContext userRole
  const displayUserRole = location.pathname.startsWith('/c1') ? 'QC Manager' :
                          location.pathname.startsWith('/c3') ? 'Maintenance Manager' : 
                          location.pathname.startsWith('/c4') ? 'Production Manager / Workforce Planner' : 
                          userRole;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Dark Navy */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">Smart Apparel<span className="text-blue-400">-LK</span></h1>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  active 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon 
                  className={`flex-shrink-0 mr-3 w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} 
                />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          {!location.pathname.startsWith('/c2') && 'Prototype v1.0 • offline mode'}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {navigation.find(n => isActive(n.href))?.name || 'Dashboard'}
            </h2>

          </div>
          <div className="flex items-center gap-4 text-sm">
            <DemoBadge mode={outputMode} />
            <div className="relative cursor-pointer text-gray-500 hover:text-gray-700">
              <BellRing className="w-5 h-5" />
              {openAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {openAlertCount}
                </span>
              )}
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 relative group">
              <div className="text-right hidden sm:block">
                <p className="font-medium text-gray-900 text-xs leading-tight">Test User</p>
                <p className="text-gray-500 text-xs leading-tight">{displayUserRole}</p>
              </div>
              <UserCircle className="w-8 h-8 text-gray-400 cursor-pointer" />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 hidden group-hover:block">
                <button 
                  onClick={() => window.confirm('Reset all demo state to original JSON fixture defaults?') && resetDemoState()}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Reset Demo State
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
