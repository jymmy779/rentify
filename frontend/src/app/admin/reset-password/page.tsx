'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/context/NotificationContext';
import { Lock, Check, Loader2, ArrowLeft, AlertCircle, Home, Sparkles, Eye, EyeOff } from 'lucide-react';
import { translateAuthError } from '@/lib/errorTranslator';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useNotification();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra truy cập cố ý/truy cập trực tiếp không có mã xác thực (URL Hash rỗng)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (!hash) {
        setErrorMsg('Yêu cầu không hợp lệ hoặc liên kết đã được sử dụng. Vui lòng quay lại trang Đăng nhập để gửi lại yêu cầu.');
        setCheckingSession(false);
        return;
      }

      // 2. Kiểm tra mã lỗi hoặc OTP hết hạn từ URL Hash (nếu có)
      if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
        setErrorMsg('Liên kết khôi phục mật khẩu này đã hết hạn hoặc không còn hiệu lực. Vui lòng gửi lại yêu cầu quên mật khẩu mới!');
        setCheckingSession(false);
        return;
      }
    }

    // 2. Kiểm tra xem người dùng đã được Supabase tự động thiết lập phiên đăng nhập tạm thời từ URL chưa
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Trường hợp không có session tạm thời từ URL hash
          setErrorMsg('Yêu cầu không hợp lệ hoặc liên kết đã được sử dụng. Vui lòng quay lại trang Đăng nhập để gửi lại yêu cầu.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg('');

    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ mật khẩu mới!');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu không khớp!');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }

    try {
      setLoading(true);
      
      // Cập nhật mật khẩu mới trực tiếp vào auth.users thông qua Session tạm thời của Supabase
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }

      setSuccess(true);
      showToast('Đặt lại mật khẩu mới thành công!', 'success');
      
      // Tự động đăng xuất luôn để xóa phiên đăng nhập tạm thời, bắt buộc người dùng đăng nhập lại bằng pass mới
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(translateAuthError(err.message) || 'Có lỗi xảy ra khi cập nhật mật khẩu.');
      showToast(translateAuthError(err.message) || 'Cập nhật thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans transition-all duration-300">
      {/* Background blobs đồng bộ với hệ thống */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-200/40 dark:bg-orange-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/40 dark:bg-indigo-500/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-slate-950/40 p-6 md:p-10 space-y-6 md:space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Brand logo */}
        <div className="flex items-center gap-3 justify-center">
          <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
            <Home className="text-white" size={24} />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">Rentify</span>
        </div>

        {checkingSession ? (
          <div className="py-12 flex flex-col justify-center items-center gap-3">
            <Loader2 className="text-orange-500 animate-spin" size={36} />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold">Đang xác thực liên kết...</p>
          </div>
        ) : errorMsg && !password ? (
          /* Trường hợp lỗi link hết hạn / không hợp lệ */
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-500/20 animate-bounce">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Đường dẫn không hợp lệ</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-semibold">{errorMsg}</p>
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full py-3.5 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Quay lại Đăng nhập
            </button>
          </div>
        ) : success ? (
          /* Khối thông báo thành công */
          <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-md">
              <Check size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Đặt lại mật khẩu thành công!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-semibold">
                Mật khẩu của bạn đã được cập nhật. Bạn sẽ tự động được chuyển hướng về trang đăng nhập sau vài giây...
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Loader2 className="text-emerald-500 animate-spin" size={24} />
            </div>
          </div>
        ) : (
          /* Form đặt lại mật khẩu mới */
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-1.5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-950 dark:text-white">Đặt lại mật khẩu</h1>
              <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm font-semibold">Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Mật khẩu mới</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-12 pr-12 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Xác nhận mật khẩu</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới phía trên"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-12 pr-12 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-slate-900/10"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Cập nhật mật khẩu mới
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
