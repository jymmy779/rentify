import { create } from 'zustand';
import { UserRole } from '@/types';

// Định nghĩa định dạng lỗi
interface LoginErrors {
  email?: string;
  password?: string;
}

interface CreateUserErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
}

interface FormStoreType {
  // 1. Trạng thái Form Đăng nhập
  loginEmail: string;
  loginPassword: string;
  loginErrors: LoginErrors;
  setLoginEmail: (email: string) => void;
  setLoginPassword: (password: string) => void;
  validateLogin: () => boolean;
  clearLoginErrors: () => void;

  // 2. Trạng thái Form Thêm nhân viên
  createFullName: string;
  createPhone: string;
  createEmail: string;
  createPassword: string;
  createRole: UserRole;
  createErrors: CreateUserErrors;
  setCreateFullName: (name: string) => void;
  setCreatePhone: (phone: string) => void;
  setCreateEmail: (email: string) => void;
  setCreatePassword: (password: string) => void;
  setCreateRole: (role: UserRole) => void;
  validateCreateUser: () => boolean;
  resetCreateForm: () => void;
}

// Regex cơ bản để kiểm tra email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Regex kiểm tra số điện thoại Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09, 01)
const phoneRegex = /^(03|05|07|08|09|01[2|6|8|9])\d{8}$/;

export const useFormStore = create<FormStoreType>((set, get) => ({
  // --- TRẠNG THÁI LOGIN ---
  loginEmail: '',
  loginPassword: '',
  loginErrors: {},
  
  setLoginEmail: (email) => {
    set({ loginEmail: email });
    // Clear lỗi email ngay khi người dùng gõ ký tự hợp lệ
    const errors = { ...get().loginErrors };
    if (email && emailRegex.test(email)) {
      delete errors.email;
      set({ loginErrors: errors });
    }
  },
  
  setLoginPassword: (password) => {
    set({ loginPassword: password });
    // Clear lỗi password ngay khi gõ từ 6 ký tự
    const errors = { ...get().loginErrors };
    if (password && password.length >= 6) {
      delete errors.password;
      set({ loginErrors: errors });
    }
  },

  validateLogin: () => {
    const { loginEmail, loginPassword } = get();
    const errors: LoginErrors = {};

    if (!loginEmail) {
      errors.email = 'Vui lòng nhập Email!';
    } else if (!emailRegex.test(loginEmail)) {
      errors.email = 'Định dạng Email không hợp lệ (Ví dụ: nhanvien@congty.com)!';
    }

    if (!loginPassword) {
      errors.password = 'Vui lòng nhập Mật khẩu!';
    } else if (loginPassword.length < 6) {
      errors.password = 'Mật khẩu phải từ 6 ký tự trở lên!';
    }

    set({ loginErrors: errors });
    return Object.keys(errors).length === 0;
  },

  clearLoginErrors: () => set({ loginErrors: {} }),


  // --- TRẠNG THÁI CREATE USER ---
  createFullName: '',
  createPhone: '',
  createEmail: '',
  createPassword: '',
  createRole: 'staff',
  createErrors: {},

  setCreateFullName: (name) => {
    set({ createFullName: name });
    const errors = { ...get().createErrors };
    if (name.trim()) {
      delete errors.fullName;
      set({ createErrors: errors });
    }
  },

  setCreatePhone: (phone) => {
    set({ createPhone: phone });
    const errors = { ...get().createErrors };
    if (phone && phoneRegex.test(phone)) {
      delete errors.phone;
      set({ createErrors: errors });
    }
  },

  setCreateEmail: (email) => {
    set({ createEmail: email });
    const errors = { ...get().createErrors };
    if (email && emailRegex.test(email)) {
      delete errors.email;
      set({ createErrors: errors });
    }
  },

  setCreatePassword: (password) => {
    set({ createPassword: password });
    const errors = { ...get().createErrors };
    if (password && password.length >= 6) {
      delete errors.password;
      set({ createErrors: errors });
    }
  },

  setCreateRole: (role) => set({ createRole: role }),

  validateCreateUser: () => {
    const { createFullName, createPhone, createEmail, createPassword } = get();
    const errors: CreateUserErrors = {};

    if (!createFullName.trim()) {
      errors.fullName = 'Vui lòng nhập Họ và Tên nhân viên!';
    }

    if (!createPhone) {
      errors.phone = 'Vui lòng nhập Số điện thoại!';
    } else if (!phoneRegex.test(createPhone)) {
      errors.phone = 'Số điện thoại không hợp lệ (Phải là số Việt Nam 10 chữ số)!';
    }

    if (!createEmail) {
      errors.email = 'Vui lòng nhập Email!';
    } else if (!emailRegex.test(createEmail)) {
      errors.email = 'Định dạng Email không hợp lệ!';
    }

    if (!createPassword) {
      errors.password = 'Vui lòng nhập Mật khẩu!';
    } else if (createPassword.length < 6) {
      errors.password = 'Mật khẩu phải từ 6 ký tự trở lên!';
    }

    set({ createErrors: errors });
    return Object.keys(errors).length === 0;
  },

  resetCreateForm: () => set({
    createFullName: '',
    createPhone: '',
    createEmail: '',
    createPassword: '',
    createRole: 'staff',
    createErrors: {}
  })
}));
