'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import MobileNav from '@/components/MobileNav/MobileNav';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Building2, Loader2, LogOut, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading, logout, startupName } = useAuth();
  const pathname = usePathname();

  const isPublicPage = ['/admin/login', '/admin/register', '/admin/register-startup', '/admin/reset-password'].includes(pathname);

  // Trang public không cần chờ auth bootstrap để render ngay.
  if (!user || isPublicPage) {
    return <>{children}</>;
  }

  // 1. Giao diện Loading khởi động
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
        {/* Điểm nhấn nền Gradient */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 dark:bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-100/30 dark:bg-red-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl dark:shadow-slate-950/40 relative group transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-tr from-orange-500 to-red-500 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 transition-opacity"></div>
            <Loader2 className="text-orange-500 animate-spin relative z-10" size={48} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-slate-900 dark:text-white font-extrabold text-lg flex items-center gap-2 justify-center transition-colors">
              Rentify <Sparkles size={16} className="text-orange-500 animate-bounce" />
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Nếu là Startup mới đăng ký nhưng đang chờ duyệt (pending_owner)
  if (profile && role === 'pending_owner') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden text-slate-800 dark:text-slate-200 font-sans transition-all duration-300">
        <div className="absolute top-[-20%] left-[-15%] w-150 h-150 bg-orange-200/45 dark:bg-orange-500/10 rounded-full blur-[130px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-15%] w-150 h-150 bg-red-100/45 dark:bg-red-500/10 rounded-full blur-[130px] animate-pulse delay-1000"></div>

        <div className="max-w-md w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl dark:shadow-slate-950/40 text-center space-y-8 relative z-10 transition-all duration-300">
          <div className="mx-auto w-24 h-24 bg-linear-to-br from-orange-500 to-red-500 rounded-[1.8rem] flex items-center justify-center shadow-lg shadow-orange-500/20 relative group">
            <div className="absolute inset-0 bg-orange-400/25 rounded-[1.8rem] blur-xl opacity-70 group-hover:opacity-100 transition-opacity animate-pulse"></div>
            <Sparkles className="text-white relative z-10" size={44} />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] tracking-widest font-extrabold text-orange-600 dark:text-orange-400 uppercase bg-orange-50 dark:bg-orange-950/40 px-3.5 py-1 rounded-full border border-orange-200 dark:border-orange-800 w-fit mx-auto block">Giai đoạn phê duyệt</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">Khởi tạo Startup! 🚀</h1>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 truncate">{startupName || 'Startup của bạn'}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed px-1">
              Hệ thống đang thiết lập chuỗi lưu trú và phê duyệt giấy phép Startup của bạn. Quá trình này thường diễn ra rất nhanh.
            </p>
          </div>

          {/* Startup info card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-left space-y-3 shadow-inner shadow-slate-100/60 dark:shadow-slate-950/20">
            <div className="flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold">Email Chủ sở hữu:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-45">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">Vai trò đăng ký:</span>
              <span className="text-orange-700 dark:text-orange-400 font-bold uppercase bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-md text-[9px] border border-orange-200 dark:border-orange-800">Chủ Startup (Owner)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">Mã chuỗi hệ thống:</span>
              <span className="text-slate-600 dark:text-slate-300 font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">{profile.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-orange-700 dark:text-orange-400">Kiểm tra email xác nhận</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Vào Gmail để bấm link xác nhận. Sau khi xác nhận xong, hệ thống sẽ tự động nâng tài khoản lên `owner` và mở quyền sử dụng.
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Nếu chưa thấy mail, kiểm tra spam/junk hoặc chờ vài phút rồi tải lại.
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 text-xs cursor-pointer"
            >
              <LogOut size={14} /> Đăng xuất & Dùng tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Nếu tài khoản nhân viên đang chờ duyệt (Pending)
  if (profile && role === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden text-slate-800 dark:text-slate-200 font-sans transition-all duration-300">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-200/45 dark:bg-orange-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-100/45 dark:bg-red-500/10 rounded-full blur-[120px]"></div>

        <div className="max-w-md w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl dark:shadow-slate-950/40 text-center space-y-8 relative z-10 transition-all duration-300">
          <div className="mx-auto w-20 h-20 bg-orange-50 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center border border-orange-200 dark:border-orange-800 relative group">
            <div className="absolute inset-0 bg-orange-200/30 dark:bg-orange-500/20 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <ShieldAlert className="text-orange-600 dark:text-orange-400 relative z-10 animate-pulse" size={40} />
          </div>

          <div className="space-y-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Đăng ký thành công!</h1>
            <p className="text-orange-700 dark:text-orange-400 font-semibold text-sm">Tài khoản của bạn đang chờ phê duyệt</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold truncate">{startupName || 'Startup của bạn'}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed px-2">
              Để bảo mật thông tin nội bộ của công ty, tài khoản mới đăng ký cần được Quản trị viên (Admin) duyệt quyền truy cập trước khi sử dụng.
            </p>
          </div>

          {/* User information panel */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2 shadow-inner shadow-slate-100/60 dark:shadow-slate-950/20">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Họ tên:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{profile.full_name || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Số điện thoại:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{profile.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email hệ thống:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-50">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Quyền hạn:</span>
              <span className="text-orange-700 dark:text-orange-400 font-bold uppercase bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded text-[10px] border border-orange-200 dark:border-orange-800">Chờ kích hoạt</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-1.5">
              <UserCheck size={12} className="text-emerald-500" /> Vui lòng báo cho Admin duyệt tài khoản này.
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-xl font-bold transition-all border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 active:scale-95 text-sm cursor-pointer"
            >
              <LogOut size={16} /> Đăng xuất & Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Nếu tài khoản đã được phê duyệt (Admin hoặc Staff)
  return (
    <div className="flex flex-col xl:flex-row min-h-screen">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 xl:ml-64 min-h-screen p-4 md:p-8 pb-24 xl:pb-8 bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-y-auto transition-all duration-300">
        <div className="max-w-400 mx-auto sticky top-0 z-30 mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur px-4 py-3 shadow-sm dark:shadow-slate-950/20 flex items-center gap-3 transition-all duration-300">
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
            <Building2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white truncate">{startupName || 'Rentify'}</p>
          </div>
        </div>
        <div className="max-w-400 mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}