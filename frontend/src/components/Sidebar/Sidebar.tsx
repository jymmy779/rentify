'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, DollarSign, Home, Settings, LogOut, Hotel, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';


const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { profile, role, logout } = useAuth();
  const { confirm } = useNotification();

  const handleLogoutClick = () => {
    confirm({
      title: 'Đăng xuất tài khoản?',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý Rentify không?',
      onConfirm: () => logout(),
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy'
    });
  };


  const menuItems = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Lịch đặt', href: '/calendar', icon: Calendar },
    { name: 'Quản lý giá', href: '/pricing', icon: DollarSign },
    { name: 'Quản lý căn', href: '/villas', icon: Hotel },
  ];

  useEffect(() => {
    const routes = ['/', '/calendar', '/pricing', '/villas', '/settings', '/settings/users'];
    routes.forEach((route) => {
      Promise.resolve(router.prefetch(route)).catch(() => {});
    });
  }, [router]);

  const navigateTo = (event: React.MouseEvent, href: string) => {
    event.preventDefault();
    if (isNavigating || href === pathname) return;

    setIsNavigating(true);
    requestAnimationFrame(() => {
      router.push(href);
      requestAnimationFrame(() => setIsNavigating(false));
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="hidden xl:flex fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex-col p-6 shadow-sm dark:shadow-slate-950/20 transition-all duration-300">
      
      {/* Brand logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
          <Home className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-wide text-slate-900 dark:text-white">
          Rentify
        </span>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => {
                Promise.resolve(router.prefetch(item.href)).catch(() => {});
              }}
              onClick={(event) => navigateTo(event, item.href)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-orange-50 dark:bg-orange-950/45 text-orange-600 dark:text-orange-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-orange-600 dark:text-orange-400' : 'group-hover:scale-110 transition-transform'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom block: Profile & Actions */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        
        {/* User profile section */}
        {profile && (
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner text-white ${
              role === 'owner'
                ? 'bg-linear-to-tr from-violet-600 to-fuchsia-400'
                : role === 'admin' 
                ? 'bg-linear-to-tr from-red-500 to-rose-400' 
                : 'bg-linear-to-tr from-orange-500 to-amber-400'
            }`}>
              {getInitials(profile.full_name || '')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate leading-tight">
                {profile.full_name || 'Chưa cập nhật'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  role === 'owner' ? 'bg-violet-500' : role === 'admin' ? 'bg-red-500' : 'bg-orange-500'
                }`}></span>
                <span className={`text-[9px] font-bold uppercase ${
                  role === 'owner' ? 'text-violet-500' : role === 'admin' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {role === 'owner' ? 'Chủ sở hữu' : role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Link 
            href="/settings"
            prefetch
            onMouseEnter={() => {
              Promise.resolve(router.prefetch('/settings')).catch(() => {});
            }}
            onClick={(event) => navigateTo(event, '/settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname.startsWith('/settings')
                ? 'bg-orange-50 dark:bg-orange-950/45 text-orange-600 dark:text-orange-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Settings size={20} className={pathname.startsWith('/settings') ? 'text-orange-600 dark:text-orange-400' : 'group-hover:rotate-45 transition-transform duration-500'} />
            <span className="font-medium">Cài đặt</span>
          </Link>
          
          <button 
            onClick={handleLogoutClick}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-semibold cursor-pointer active:scale-95"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
