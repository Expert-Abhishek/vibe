'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Compass,
  MapPin,
  Route,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Drivers', href: '/drivers', icon: Car },
  { name: 'Guides', href: '/guides', icon: Compass },
  { name: 'Destinations', href: '/destinations', icon: MapPin },
  { name: 'Plans & Packages', href: '/plans', icon: Route },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col justify-between h-screen sticky top-0 z-30">
      <div>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              V
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">Vibzz</span>
              <span className="block text-[10px] text-brand-500 font-bold uppercase tracking-widest">
                Admin Control
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 text-[11px] font-bold text-dark-textMuted uppercase tracking-wider mb-3">
            Main Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-black font-bold shadow-md shadow-brand-500/20'
                    : 'text-gray-300 hover:bg-dark-hover hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-black" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Badge */}
      <div className="p-4 m-4 rounded-xl bg-dark-hover/60 border border-dark-border/80">
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-500 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Super Admin Mode</span>
        </div>
        <p className="text-[11px] text-dark-textMuted leading-relaxed">
          Logged in as System Admin. All operations are live & logged.
        </p>
      </div>
    </aside>
  );
}
