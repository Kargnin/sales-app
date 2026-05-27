import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import { useAuthStore } from '../../stores/authStore.js';
import { Button } from '../ui/button.js';
import { Separator } from '../ui/separator.js';
import {
  Users, Store, FileText, MapPin, ShoppingCart, 
  PlusCircle, LogOut, Building2, UserCircle, Package,
  Plus, X, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils.js';
import { NotificationBell } from './NotificationBell.js';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionMenuOpen]);

  const handleActionClick = (tab: string, openAction: string) => {
    setIsActionMenuOpen(false);
    
    const params: Record<string, string> = { tab };
    if (openAction) {
      params.open_action = openAction;
    }
    
    setSearchParams(params);
    
    if (role === 'admin') {
      const q = openAction ? `&open_action=${openAction}` : '';
      navigate(`/admin?tab=${tab}${q}`);
    } else {
      navigate(`/salesman?tab=${tab}`);
    }
  };

  const activeTab = searchParams.get('tab') || '';
  const role = user?.role;
  const pathname = location.pathname;

  // Determine active item based on role, pathname, and tab
  const getActiveItem = () => {
    if (pathname.startsWith('/shop/')) {
      return 'shops';
    }
    if (pathname.startsWith('/order/')) {
      return 'orders';
    }
    if (pathname.startsWith('/admin/employee/')) {
      return 'roster';
    }

    if (role === 'admin') {
      return activeTab || 'roster';
    } else {
      return activeTab || 'shops';
    }
  };

  const handleSelectTab = (tab: string) => {
    if (role === 'admin') {
      navigate(`/admin?tab=${tab}`);
    } else {
      navigate(`/salesman?tab=${tab}`);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const adminMenu = [
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'shops', label: 'Approvals', icon: Store },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'analytics', label: 'Logs', icon: FileText },
  ];

  const salesmanMenu = [
    { id: 'shops', label: 'Outlets', icon: Store },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'visits', label: 'Visits', icon: MapPin },
  ];

  const menuItems = role === 'admin' ? adminMenu : salesmanMenu;
  const currentActive = getActiveItem();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#050806] text-slate-100 border-r border-[#1a231f] w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧼</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              SalesApp
            </span>
          </div>
          <div className="hidden md:block">
            <NotificationBell />
          </div>
        </div>
        
        {user?.tenantName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-900/50 rounded-md mt-2 text-emerald-400 text-xs font-semibold w-fit">
            <Building2 className="size-3.5" />
            <span className="truncate max-w-[150px]">{user.tenantName}</span>
          </div>
        )}
      </div>

      <Separator className="bg-[#1a231f] opacity-60" />

      {/* Navigation Options */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3 mb-2">
          Navigation
        </span>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentActive === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                isActive 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`size-4.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <Separator className="bg-[#1a231f] opacity-60" />

      {/* Bottom Profile Area & Sign Out */}
      <div className="p-4 flex flex-col gap-3">
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-2 py-1.5 bg-slate-900/40 border border-slate-900/20 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-all select-none group"
        >
          <UserCircle className="size-8 text-slate-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-slate-200 group-hover:text-slate-100 transition-colors">{user?.username}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{user?.role}</span>
          </div>
        </div>

        <Button 
          variant="destructive"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-xs h-9 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/30 font-semibold"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#020403] w-full overflow-hidden">
      {/* Desktop Sidebar (visible on larger screens) */}
      <div className="hidden md:flex shrink-0">
        <SidebarContent />
      </div>

      {/* Main Responsive Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[#050806] border-b border-[#1a231f] sticky top-0 z-40 select-none shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧼</span>
            <span className="font-extrabold text-sm tracking-tight text-slate-200">
              SalesApp
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user?.tenantName && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-900/50 rounded-full text-emerald-400 text-[10px] font-semibold truncate max-w-[110px]">
                🏢 {user.tenantName}
              </div>
            )}
            
            {/* Unified Mobile Header Capsule (Bell + More Options Dropdown) */}
            <div className="flex items-center bg-[#101512]/60 border border-[#1a231f] backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg gap-2.5 relative" ref={dropdownRef}>
              <NotificationBell />
              
              <div className="w-[1px] h-4 bg-[#1a231f]" />
              
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors border-none outline-none cursor-pointer bg-transparent p-0.5"
                title="More Options"
              >
                <MoreHorizontal className={cn("size-5 transition-transform duration-300", isActionMenuOpen ? "rotate-90 text-emerald-400" : "rotate-0")} />
              </button>

              {/* Quick Action Floating Dropdown Menu */}
              {isActionMenuOpen && (
                <div className="absolute top-10 right-0 w-52 bg-[#090d0a]/98 border border-[#17221b] backdrop-blur-2xl rounded-2xl p-2.5 flex flex-col gap-1 shadow-2xl z-50 animate-in fade-in slide-in-from-top-3 duration-200 select-none">
                  <span className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase px-2.5 py-1 border-b border-[#1b2820]/30 mb-1">
                    Quick Actions
                  </span>
                  {role === 'admin' ? (
                    <>
                      <button
                        onClick={() => handleActionClick('roster', 'add_employee')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <Users className="size-4 text-slate-400" />
                        <span>Add Employee</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('products', 'add_product')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <Package className="size-4 text-slate-400" />
                        <span>Add Product</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('shops', 'add_shop')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <Store className="size-4 text-slate-400" />
                        <span>Add Shop</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('orders', 'add_order')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <ShoppingCart className="size-4 text-slate-400" />
                        <span>Direct B2B Order</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleActionClick('register', '')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <PlusCircle className="size-4 text-slate-400" />
                        <span>Register Shop</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('orders', '')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <ShoppingCart className="size-4 text-slate-400" />
                        <span>B2B Orders</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          handleSelectTab('shops');
                          toast.info("Select an outlet in Outlets tab to record a check-in!");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                      >
                        <MapPin className="size-4 text-slate-400" />
                        <span>Record Visit</span>
                      </button>
                    </>
                  )}
                  
                  <span className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase px-2.5 py-1 border-t border-[#1b2820]/30 mt-1 mb-1 pt-2">
                    Account
                  </span>
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left font-bold text-xs text-slate-300 hover:text-[#090d0a] hover:bg-[#e1fd52] transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                  >
                    <UserCircle className="size-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left font-bold text-xs text-red-400 hover:text-white hover:bg-red-950/40 transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Backdrop overlay for mobile action drawer focus */}
        {isActionMenuOpen && (
          <div 
            onClick={() => setIsActionMenuOpen(false)}
            className="fixed inset-0 bg-[#020403]/40 backdrop-blur-[2px] z-45 md:hidden animate-in fade-in duration-200"
          />
        )}

        {/* High-Fidelity, Static-Width Glassmorphic Floating Navigation Capsule */}
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md h-16 bg-[#070b08]/85 border border-[#1b2820]/80 backdrop-blur-xl rounded-2xl flex items-center justify-around px-2 shadow-2xl pointer-events-auto pb-[env(safe-area-inset-bottom)] select-none">
          <div className={cn(
            "grid w-full h-full items-center",
            role === 'admin' ? "grid-cols-5" : "grid-cols-3"
          )}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentActive === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className="flex flex-col items-center justify-center w-full h-full relative outline-none border-none cursor-pointer bg-transparent p-0 transition-all duration-200"
                >
                  {/* Stable rounded pill box highlight inside the capsule grid element */}
                  {isActive && (
                    <div className="absolute inset-x-1.5 inset-y-1.5 bg-white/10 border border-white/5 backdrop-blur-xs rounded-xl -z-10 shadow-inner" />
                  )}
                  <Icon className={cn("size-4.5 transition-colors duration-200", isActive ? "text-emerald-400 scale-105" : "text-slate-500")} />
                  <span className={cn(
                    "text-[9px] uppercase tracking-widest font-sans font-semibold mt-1 transition-colors duration-200 leading-none",
                    isActive ? "text-emerald-400 font-extrabold" : "text-slate-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
