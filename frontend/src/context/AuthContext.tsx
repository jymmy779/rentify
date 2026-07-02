'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import { translateAuthError } from '@/lib/errorTranslator';

const promiseTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string, onTimeout?: () => void): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(errorMsg));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  startupName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  registerStartup: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    startupName: string,
    businessType: string,
    activationCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  refreshStartup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startupName, setStartupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSessionUserIdRef = useRef<string | null>(null);
  
  const { showToast } = useNotification();
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async (uid: string, email: string, controller?: AbortController) => {
    try {
      const signal = controller?.signal;
      const profileQuery = supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (signal) {
        (profileQuery as any).abortSignal(signal);
      }

      const { data, error } = await promiseTimeout<any>(
        profileQuery as any,
        15000,
        'Tải hồ sơ người dùng quá lâu. Vui lòng thử lại.',
        () => controller?.abort()
      );

      if (error) {
        console.error('[AuthContext] ❌ Lỗi khi fetch profile từ database:', error);
        // Nếu hồ sơ chưa được tạo tự động bởi trigger (do lỗi đồng bộ hoặc tài khoản cũ)
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] ℹ️ Chưa có profile, tiến hành tạo mặc định...');
          // Kiểm tra xem hệ thống có tài khoản nào chưa để xét quyền Admin đầu tiên
          const countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });

          if (signal) {
            (countQuery as any).abortSignal(signal);
          }

          const { count } = await promiseTimeout<any>(
            countQuery as any,
            15000,
            'Kiểm tra số lượng hồ sơ quá lâu. Vui lòng thử lại.',
            () => controller?.abort()
          );
          const isFirstUser = count === 0;

          const defaultProfile = {
            id: uid,
            email,
            full_name: '',
            phone: '',
            role: isFirstUser ? 'owner' : ('pending' as UserRole),
            tenant_id: uid // Admin mới/User mới tự làm chủ chính mình làm tenant mặc định
          };

          const insertQuery = supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();

          if (signal) {
            (insertQuery as any).abortSignal(signal);
          }

          const { data: insertedData } = await promiseTimeout<any>(
            insertQuery as any,
            15000,
            'Tạo hồ sơ mặc định quá lâu. Vui lòng thử lại.',
            () => controller?.abort()
          );

          if (insertedData) {
            console.log('[AuthContext] ✅ Tạo profile mặc định thành công:', insertedData);
            return insertedData as UserProfile;
          }
        }
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('[AuthContext] 💥 Lỗi bắt ngoại lệ fetch profile:', err);
      return null;
    }
  };

  const fetchStartupName = async (tenantId: string, controller?: AbortController) => {
    try {
      const signal = controller?.signal;
      const tenantQuery = supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();

      if (signal) {
        (tenantQuery as any).abortSignal(signal);
      }

      const { data, error } = await promiseTimeout<any>(
        tenantQuery as any,
        15000,
        'Tải tên startup quá lâu. Vui lòng thử lại.',
        () => controller?.abort()
      );

      if (error) {
        console.error('[AuthContext] ❌ Lỗi khi fetch tenant:', error);
        return null;
      }

      return data?.name || null;
    } catch (err) {
      console.error('[AuthContext] 💥 Lỗi bắt ngoại lệ fetch tenant:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const controller = new AbortController();
      const prof = await fetchProfile(user.id, user.email || '', controller);
      setProfile(prof);

      if (prof?.tenant_id) {
        const name = await fetchStartupName(prof.tenant_id, controller);
        setStartupName(name);
      } else {
        setStartupName(null);
      }
    }
  };

  const refreshStartup = async () => {
    if (!profile?.tenant_id) {
      setStartupName(null);
      return;
    }

    const controller = new AbortController();
    const name = await fetchStartupName(profile.tenant_id, controller);
    setStartupName(name);
  };

  const autoApproveStartupIfConfirmed = async (currentProfile: UserProfile) => {
    if (!user?.email_confirmed_at) return false;
    if (currentProfile.role !== 'pending_owner') return false;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const response = await fetch('/api/auth/approve-startup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result?.error || 'Không thể tự động phê duyệt tài khoản.');
    }

    await refreshProfile();
    return true;
  };

  // Khôi phục session và lắng nghe thay đổi trạng thái đăng nhập (Single Source of Truth)
  useEffect(() => {    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {        
        // Giải mã JWT để xem chi tiết thời gian hết hạn của Access Token
        try {
          const token = session.access_token;
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
          }
        } catch (e) {
          console.error('[AuthContext] Lỗi parse JWT:', e);
        }
      }

      if (session?.user) {
        if (lastSessionUserIdRef.current !== session.user.id) {
          lastSessionUserIdRef.current = session.user.id;
          setUser(session.user);
        }
      } else {
        lastSessionUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setStartupName(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Tải profile người dùng riêng biệt khi trạng thái user thay đổi (Tránh deadlock trong Auth Listener)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const controller = new AbortController();
      
      try {
        const prof = await fetchProfile(user.id, user.email || '', controller);
        setProfile(prof);

        if (prof?.tenant_id) {
          const name = await fetchStartupName(prof.tenant_id, controller);
          setStartupName(name);
        } else {
          setStartupName(null);
        }

        if (prof) {
          await autoApproveStartupIfConfirmed(prof);
        }
      } catch (error) {
        controller.abort();
        console.error('[AuthContext] ❌ Lỗi khi tải profile của user:', error);
        showToast('Không thể tải hồ sơ người dùng. Vui lòng thử lại.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Bảo vệ Router (Route Guard) client-side
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/admin/login', '/admin/register', '/admin/register-startup', '/admin/reset-password'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user) {
      if (!isPublicPath) {
        router.push('/admin/login');
      }
    } else {
      // Đã đăng nhập
      if (isPublicPath) {
        // Nếu đang ở trang đặt lại mật khẩu thì tuyệt đối KHÔNG tự động chuyển hướng về trang chủ
        if (pathname === '/admin/reset-password') {
          return;
        }
        // Nếu đã đăng nhập mà được duyệt quyền rồi thì cho vào trang chủ
        if (profile && profile.role !== 'pending' && profile.role !== 'pending_owner') {
          router.push('/admin');
        }
      } else {
        // Đang ở các trang nội bộ, kiểm tra xem tài khoản có bị pending không
        if (profile && profile.role === 'pending' && pathname !== '/admin/pending') {
          router.push('/admin/login'); // Để AppLayout tự động xử lý view chờ duyệt
        }
        if (profile && profile.role === 'pending_owner' && pathname !== '/pending-startup') {
          // pending_owner sẽ được giữ hoặc redirect sang view chờ duyệt Startup (được xử lý trong AppLayout hoặc redirect)
        }

        // Chặn non-owner/non-admin vào các trang cấu hình nâng cao và quản trị nhân sự
        const isProtectedAdminPath = pathname.startsWith('/admin/settings/users') || pathname.startsWith('/admin/villas/edit');
        const isSettings = pathname === '/admin/settings';
        
        if (isProtectedAdminPath && profile?.role !== 'admin' && profile?.role !== 'owner') {
          showToast('Bạn không có quyền truy cập trang quản trị này!', 'error');
          router.push('/admin');
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  // Đăng nhập bằng Email/Password
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng ký tài khoản mới kèm metadata Họ tên & SĐT
  const register = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng ký Startup/Chuỗi kinh doanh mới chống Spam
  const registerStartup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    startupName: string,
    businessType: string,
    activationCode?: string
  ) => {
    try {
      const response = await fetch('/api/auth/register-startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          startupName,
          businessType,
          activationCode,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Không thể khởi tạo tài khoản mới.');
      }

      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Lỗi đăng ký Startup:', err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      setUser(null);
      setProfile(null);
      router.replace('/admin/login');
      showToast('Đăng xuất thành công!');
      void supabase.auth.signOut().catch((err) => {
        console.error(err);
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Người dùng tự cập nhật thông tin cá nhân
  const updateProfile = async (fullName: string, phone: string) => {
    if (!user) return { success: false, error: 'Chưa đăng nhập.' };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Tự đổi mật khẩu của mình
  const changePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Gửi email khôi phục mật khẩu (Quên mật khẩu)
  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/reset-password` : undefined,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile ? profile.role : null,
        startupName,
        loading,
        login,
        loginWithGoogle,
        register,
        registerStartup,
        logout,
        updateProfile,
        changePassword,
        sendPasswordReset,
        refreshProfile,
        refreshStartup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
};
