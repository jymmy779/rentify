'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotification } from '@/context/NotificationContext';
import {
  Settings, Save, RotateCcw, Check,
  Info, MessageSquare, Sparkles, ArrowLeft,
  Trash2, Bold, Italic, Underline as UnderlineIcon,
  Type, Smile, CaseSensitive,
  ChevronDown, MapPin, Clock, DollarSign, Home, X, AlertCircle, HelpCircle,
  User, Lock, Users, KeyRound, Phone, Mail, Loader2, Building2, Eye, EyeOff
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { renderToStaticMarkup } from 'react-dom/server';

const DEFAULT_TEMPLATE = `✍️ XÁC NHẬN TIỀN CỌC VILLA
Địa chỉ: {{villa_address}}
Định vị: {{villa_map_link}}
Khách Hàng: {{customer_name}}
SĐT: {{customer_phone}}
Số lượng khách: {{total_guests}} gồm {{adults}} người lớn và {{children}} trẻ em
⏰Check in: sau 14h ngày {{check_in}}
⏰Check out: trước 12h ngày {{check_out}}
💸Tiền còn lại (thanh toán khi nhận phòng): {{remaining_amount}}

📞  Quản giá đón khách và hỗ trợ: 0326151111 (a Tùng)

🚫 QUY ĐỊNH LƯU TRÚ & PHỤ PHÍ
-  Quý khách vui lòng cung cấp ảnh chụp CCCD của cả đoàn để làm thủ tục khai báo tạm trú. Chúng em sẽ từ chối nhận khách nếu mục này không thể thực hiện.
-  Theo quy định mới ko được giữ căn cước công dân nên villa sẽ giữ thế chân 2 triệu đối với mỗi đoàn . Số tiền này sẽ được gửi lại vào ngày check out khi thủ tục check out không xảy ra hư hỏng gì nghiêm trọng.
-  Ở quá giờ phụ thu 300k/h nếu ngày hôm sau villa ko có khách .
-  Villa báo giá dựa trên số khách đăng ký. Phát sinh thêm người phụ thu 150.000đ/người (Vui lòng báo trước để villa chuẩn bị thêm chăn ga).
-  Quý khách vui lòng dọn dẹp, rửa bát đĩa sau khi nấu nướng. Phí hỗ trợ dọn dẹp từ 300.000-500.000đ tùy hiện trạng nếu không tự dọn.
-  Karaoke được hát tới 22h  ( quy định của toàn bộ nhà phố và villa Vũng Tàu)
-  Không bỏ đồ ăn xuống hồ bơi, phụ thu 1tr-3tr tuỳ hiện trạng.
-  Không sử dụng, tàng trữ chất cấm, cờ bạc, mại dâm theo quy định pháp luật.
-  Villa không nhận dàn loa công suất lớn và DJ

♻️ Khách hàng hủy đặt phòng sẽ không được hoàn lại tiền cọc.

Cám ơn quý khách 🌸`;

const PLACEHOLDERS = [
  { label: 'Tên khách', value: '{{customer_name}}' },
  { label: 'SĐT khách', value: '{{customer_phone}}' },
  { label: 'Ngày Check-in', value: '{{check_in}}' },
  { label: 'Ngày Check-out', value: '{{check_out}}' },
  { label: 'Tên Villa', value: '{{villa_name}}' },
  { label: 'Địa chỉ Villa', value: '{{villa_address}}' },
  { label: 'Link bản đồ', value: '{{villa_map_link}}' },
  { label: 'Tổng khách', value: '{{total_guests}}' },
  { label: 'Người lớn', value: '{{adults}}' },
  { label: 'Trẻ em', value: '{{children}}' },
  { label: 'Tiền còn lại', value: '{{remaining_amount}}' },
];

const BULLET_TYPES = [
  { label: 'Gạch ngang', value: '- ', icon: '-' },
  { label: 'Dấu chấm', value: '• ', icon: '•' },
  { label: 'Số thứ tự', value: '1. ', icon: '1.' },
  { label: 'Dấu tích', value: '✅ ', icon: '✅' },
  { label: 'Ngôi sao', value: '⭐ ', icon: '⭐' },
];

// Helper to convert to Unicode Bold
const toUnicodeBold = (text: string) => {
  const map: any = {
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  const reverseMap: any = {};
  Object.entries(map).forEach(([k, v]) => { reverseMap[v as string] = k; });

  const chars = [...text];
  const hasBold = chars.some(c => reverseMap[c]);

  if (hasBold) {
    return chars.map(c => reverseMap[c] || c).join('');
  }
  return chars.map(c => map[c] || c).join('');
};

const toUnicodeItalic = (text: string) => {
  const map: any = {
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻'
  };
  const reverseMap: any = {};
  Object.entries(map).forEach(([k, v]) => { reverseMap[v as string] = k; });

  const chars = [...text];
  const hasItalic = chars.some(c => reverseMap[c]);

  if (hasItalic) {
    return chars.map(c => reverseMap[c] || c).join('');
  }
  return chars.map(c => map[c] || c).join('');
};

const toUnicodeUnderline = (text: string) => {
  if (text.includes('\u0332')) {
    return text.replace(/\u0332/g, '');
  }
  return [...text].map(c => c === ' ' ? ' ' : c + '\u0332').join('');
};

const Badge = ({ label, value }: { label: string, value: string }) => (
  <span
    className="variable-badge bg-indigo-100/50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 font-bold text-[11px] inline-flex items-center gap-1 mx-0.5 align-middle select-none shadow-sm group/badge"
    data-value={value}
    contentEditable={false}
  >
    {label}
    <span className="delete-badge p-0.5 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer text-indigo-400 flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
    </span>
  </span>
);

const templateToHtml = (template: string) => {
  let html = template.replace(/\n/g, '<br>');
  PLACEHOLDERS.forEach(p => {
    const badgeHtml = renderToStaticMarkup(<Badge label={p.label} value={p.value} />);
    html = html.split(p.value).join(badgeHtml);
  });
  return html;
};

const htmlToTemplate = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Convert <br> back to \n
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Convert badges back to {{value}}
  div.querySelectorAll('.variable-badge').forEach(badge => {
    const value = badge.getAttribute('data-value');
    badge.replaceWith(value || '');
  });

  return div.innerText || div.textContent || '';
};

const toggleCase = (text: string) => {
  const boldLower = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const boldUpper = '𝐀𝐁𝐂𝐃𝐄𝐅Ｇ𝐇𝐈𝐉𝐊𝐋𝐌𝐍class="highlight"𝐎ＰＱ𝐑𝐒𝐓𝐔𝐕𝐖𝐗ＹＺ';
  const italicLower = '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𘲳𝘳𝘴𝘵𝘶𝘷𝘸𘲴𝘺𝘻';
  const italicUpper = '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𘱉𘱊𝘖𘱋𘱌𘱍𘱎𘱏𘱐𘱑𘱒𘱓𝘞𘱔𘱕𘱖';

  const isUpper = (str: string) => {
    const chars = [...str];
    return !chars.some(c =>
      (c >= 'a' && c <= 'z') ||
      [...boldLower].includes(c) ||
      [...italicLower].includes(c)
    );
  };

  const chars = [...text];
  if (isUpper(text)) {
    return chars.map(c => {
      const idxBU = [...boldUpper].indexOf(c);
      if (idxBU !== -1) return [...boldLower][idxBU];
      const idxIU = [...italicUpper].indexOf(c);
      if (idxIU !== -1) return [...italicLower][idxIU];
      return c.toLowerCase();
    }).join('');
  } else {
    return chars.map(c => {
      const idxBL = [...boldLower].indexOf(c);
      if (idxBL !== -1) return [...boldUpper][idxBL];
      const idxIL = [...italicLower].indexOf(c);
      if (idxIL !== -1) return [...italicUpper][idxIL];
      return c.toUpperCase();
    }).join('');
  }
};

const ThemeSwitcherSection = () => {
  const { themeMode, setThemeMode } = useTheme();

  const themes = [
    {
      id: 'light' as const,
      label: 'Sáng',
      desc: 'Giao diện sáng mặc định',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
      bgColor: 'bg-amber-50 border-amber-200',
      selectedBg: 'bg-amber-100 border-amber-400 ring-2 ring-amber-300',
      iconColor: 'text-amber-600',
    },
    {
      id: 'dark' as const,
      label: 'Tối',
      desc: 'Giao diện tối cao cấp',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
      bgColor: 'bg-indigo-50 border-indigo-200',
      selectedBg: 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'system' as const,
      label: 'Hệ thống',
      desc: 'Theo cài đặt thiết bị',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      bgColor: 'bg-slate-50 border-slate-200',
      selectedBg: 'bg-slate-100 border-slate-400 ring-2 ring-slate-300',
      iconColor: 'text-slate-600',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 max-w-2xl mt-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Giao diện hiển thị
        </h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-0.5">Tùy chỉnh chế độ hiển thị theo sở thích của bạn</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setThemeMode(t.id)}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-center ${
              themeMode === t.id
                ? t.selectedBg + ' shadow-md'
                : t.bgColor + ' hover:shadow-sm dark:bg-slate-800/40 dark:border-slate-700'
            }`}
          >
            <div className={`${themeMode === t.id ? t.iconColor : 'text-slate-400'} transition-colors`}>
              {t.icon}
            </div>
            <div>
              <p className={`font-bold text-sm ${themeMode === t.id ? 'text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>
                {t.label}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t.desc}</p>
            </div>
            {themeMode === t.id && (
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {themeMode === 'light'
            ? 'Bạn đang sử dụng giao diện Sáng. Mọi thành phần sẽ hiển thị với màu nền sáng.'
            : themeMode === 'dark'
            ? 'Bạn đang sử dụng giao diện Tối cao cấp. Trải nghiệm tốt nhất trong môi trường thiếu sáng.'
            : 'Giao diện sẽ tự động chuyển đổi theo cài đặt hệ thống của thiết bị bạn đang sử dụng.'}
        </p>
      </div>
    </div>
  );
};

interface TenantData {
  id: string;
  name: string;
  phone: string | null;
  business_type: string | null;
  status: string;
}

const StartupManagementSection = () => {
  const { profile, role, refreshProfile } = useAuth();
  const { showToast, confirm: showConfirmModal } = useNotification();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startupName, setStartupName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Transfer states
  const [admins, setAdmins] = useState<any[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTenantDetails();
      if (role === 'owner') {
        fetchCoAdmins();
      }
    }
  }, [profile, role]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile?.tenant_id)
        .single();

      if (data) {
        setTenant(data);
        setStartupName(data.name || '');
        setPhone(data.phone || '');
        setBusinessType(data.business_type || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('tenant_id', profile?.tenant_id)
        .in('role', ['admin', 'owner'])
        .neq('id', profile?.id); // Trừ chính mình

      if (data) {
        setAdmins(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'owner') {
      showToast('Từ chối thao tác! Bạn không có quyền thực hiện việc này.', 'error');
      return;
    }
    if (!startupName) {
      showToast('Vui lòng nhập tên Startup!', 'error');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('tenants')
        .update({
          name: startupName,
          phone: phone,
          business_type: businessType
        })
        .eq('id', profile?.tenant_id);

      if (error) throw error;
      showToast('Cập nhật thông tin Startup thành công!', 'success');
      fetchTenantDetails();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi cập nhật Startup', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTransferOwner = async (targetAdminId: string, targetAdminName: string) => {
    showConfirmModal({
      title: 'Chuyển nhượng quyền sở hữu tối cao?',
      message: `Bạn có chắc chắn muốn chuyển quyền sở hữu Startup này cho ${targetAdminName}? Sau khi xác nhận, vai trò của bạn sẽ tự động hạ cấp xuống Quản trị viên (Admin) và không thể đảo ngược tác vụ này thủ công.`,
      onConfirm: async () => {
        try {
          setTransferLoading(true);
          
          // 1. Thăng cấp tài khoản đích lên Owner
          const { error: promoteError } = await supabase
            .from('profiles')
            .update({ role: 'owner' })
            .eq('id', targetAdminId);

          if (promoteError) throw promoteError;

          // 2. Hạ cấp chính mình xuống Admin
          const { error: demoteError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', profile?.id);

          if (demoteError) throw demoteError;

          showToast(`Đã chuyển nhượng quyền Owner thành công cho ${targetAdminName}!`, 'success');
          await refreshProfile();
        } catch (err: any) {
          showToast(err.message || 'Lỗi chuyển nhượng quyền sở hữu.', 'error');
        } finally {
          setTransferLoading(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-slate-950/30 flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-orange-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mt-6">
      
      {/* Cấu hình Startup */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <Building2 className="text-orange-600" size={20} />
            Thông tin Startup / Chuỗi của bạn
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-0.5">Cấu hình chuỗi kinh doanh lưu trú trên Rentify</p>
        </div>

        <form onSubmit={handleUpdateTenant} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Tên Startup</label>
              <input
                type="text"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                disabled={role !== 'owner' || saving}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 px-4 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Loại hình kinh doanh</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={role !== 'owner' || saving}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 px-4 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="homestay">Homestay / Hostel</option>
                <option value="villa">Biệt thự / Villa</option>
                <option value="apartment">Căn hộ dịch vụ</option>
                <option value="hotel">Khách sạn nhỏ</option>
                <option value="room">Phòng cho thuê</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">SĐT liên hệ chính</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={role !== 'owner' || saving}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 px-4 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {role === 'owner' ? (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Cập nhật Startup
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-500">
              ⚠️ Chỉ có Chủ sở hữu (Owner) mới được quyền thay đổi thông tin Startup.
            </div>
          )}
        </form>
      </div>

      {/* Khu vực Owner Transfer - Chỉ hiển thị cho Owner chính của chuỗi */}
      {role === 'owner' && (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
          <div className="border-b border-red-100 dark:border-red-900/30 pb-4">
            <h2 className="text-lg font-bold text-red-950 dark:text-red-400 flex items-center gap-2">
              <KeyRound className="text-red-600" size={20} />
              Chuyển nhượng quyền Chủ sở hữu (Owner)
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-0.5">
              Ủy thác hoặc bàn giao toàn quyền kiểm soát tối cao của Startup Rentify cho một cộng sự Admin khác trong chuỗi.
            </p>
          </div>

          {admins.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              Chưa có Admin nào khác cùng Startup để thực hiện chuyển nhượng. Bạn có thể thêm nhân sự mới với vai trò Admin tại trang Quản lý nhân sự.
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{admin.full_name || 'Chưa đặt tên'}</h4>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{admin.email}</p>
                  </div>

                  <button
                    onClick={() => handleTransferOwner(admin.id, admin.full_name || admin.email)}
                    disabled={transferLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl text-xs font-bold border border-red-200 hover:border-red-500 transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    Bàn giao quyền Owner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SettingsPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, role, updateProfile, changePassword, refreshStartup } = useAuth();
  const { showToast, confirm: showConfirmModal } = useNotification();

  // State Tab - đọc từ URL params để giữ nguyên khi Back
  const urlTab = searchParams.get('tab');
  const validTabs = ['profile', 'security', 'template'] as const;
  type TabType = typeof validTabs[number];
  const [activeTab, setActiveTab] = useState<TabType>(
    validTabs.includes(urlTab as TabType) ? (urlTab as TabType) : 'profile'
  );

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as TabType)) {
      setActiveTab(urlTab as TabType);
    }
  }, [urlTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  // Tab 1: Profile States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Tab 2: Security States
  const [oldPassword, setOldPassword] = useState(''); // Supabase client không yêu cầu mật khẩu cũ để đổi pass mới, nhưng thêm vào cho giao diện chuyên nghiệp
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);

  // Tab 3: Template States (Được giữ nguyên)
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showBullets, setShowBullets] = useState(false);
 
  // Load thông tin ban đầu
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);
 
  useEffect(() => {
    if (activeTab === 'template' && ['admin', 'owner'].includes(role || '') && profile?.tenant_id) {
      fetchSettings();
    }
  }, [activeTab, role, profile]);
 
  useEffect(() => {
    if (activeTab === 'template' && !loading && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const newHtml = templateToHtml(template);
      if (document.activeElement !== editorRef.current && currentHtml !== newHtml) {
        editorRef.current.innerHTML = newHtml;
      }
    }
  }, [template, loading, activeTab]);
 
  const fetchSettings = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'booking_confirmation_template')
        .eq('tenant_id', profile.tenant_id)
        .single();
 
      if (data) {
        setTemplate(data.value);
      } else {
        setTemplate('');
      }
    } catch (err) {
      console.log('Using empty template for new startup');
      setTemplate('');
    } finally {
      setLoading(false);
    }
  };

  // Lưu thông tin cá nhân (Tab 1)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      showToast('Vui lòng điền đầy đủ Họ tên và SĐT!', 'error');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await updateProfile(fullName, phone);
      if (res.success) {
        showToast('Cập nhật thông tin cá nhân thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi cập nhật thông tin.', 'error');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Đổi mật khẩu cá nhân (Tab 2)
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ thông tin mật khẩu!', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');
      return;
    }

    try {
      setSecuritySaving(true);
      const res = await changePassword(newPassword);
      if (res.success) {
        showToast('Thay đổi mật khẩu cá nhân thành công!', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.error || 'Lỗi đổi mật khẩu.', 'error');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi đổi mật khẩu.', 'error');
    } finally {
      setSecuritySaving(false);
    }
  };

  // Lưu cấu hình template tin nhắn (Tab 3)
  const handleSaveTemplate = async () => {
    if (!profile?.tenant_id) {
      showToast('Không tìm thấy thông tin Startup (tenant_id).', 'error');
      return;
    }
    try {
      setSaving(true);
      const currentTemplate = htmlToTemplate(editorRef.current?.innerHTML || '');
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'booking_confirmation_template', 
          value: currentTemplate,
          tenant_id: profile.tenant_id
        }, { onConflict: 'key,tenant_id' });

      if (error) throw error;

      setTemplate(currentTemplate);
      setSaved(true);
      void refreshStartup();
      showToast('Đã lưu cấu hình tin nhắn cọc thành công!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu cài đặt!', 'error');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (val: string, label?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    if (label) {
      const badgeHtml = renderToStaticMarkup(<Badge label={label} value={val} />);
      document.execCommand('insertHTML', false, badgeHtml);
    } else {
      document.execCommand('insertText', false, val);
    }

    setTemplate(htmlToTemplate(editor.innerHTML));
  };

  const clearAllPlaceholders = () => {
    showConfirmModal({
      title: 'Xóa tất cả biến?',
      message: 'Bạn có chắc muốn xóa tất cả các biến trong nội dung?',
      onConfirm: () => {
        const newTemplate = template.replace(/{{.*?}}/g, '');
        setTemplate(newTemplate);
        showToast('Đã xóa sạch các biến');
      }
    });
  };

  const transformSelection = (type: 'bold' | 'italic' | 'underline' | 'uppercase' | 'list', bulletStyle?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (!selectedText && type !== 'list') return;

    let newText = '';
    switch (type) {
      case 'bold': newText = toUnicodeBold(selectedText); break;
      case 'italic': newText = toUnicodeItalic(selectedText); break;
      case 'underline': newText = toUnicodeUnderline(selectedText); break;
      case 'uppercase': newText = toggleCase(selectedText); break;
      case 'list':
        const prefix = bulletStyle || '- ';
        if (!selectedText) {
          newText = prefix;
        } else {
          newText = selectedText.split('\n').map((line, idx) => {
            const actualPrefix = prefix === '1. ' ? `${idx + 1}. ` : prefix;
            return line.trim().startsWith(actualPrefix.trim()) ? line : `${actualPrefix}${line}`;
          }).join('\n');
        }
        break;
    }

    editor.focus();
    document.execCommand('insertText', false, newText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          transformSelection('bold');
          break;
        case 'i':
          e.preventDefault();
          transformSelection('italic');
          break;
        case 'u':
          if (e.shiftKey) {
            e.preventDefault();
            transformSelection('uppercase');
          } else {
            e.preventDefault();
            transformSelection('underline');
          }
          break;
      }
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    insertPlaceholder(emojiData.emoji);
    setShowEmoji(false);
  };

  const renderPreview = () => {
    let result = template;
    const mockData = {
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0901234567',
      check_in: '20/05/2026',
      check_out: '22/05/2026',
      villa_name: 'Villa Sunny Vũng Tàu',
      villa_address: '86/1 Trần Phú, Phường 5, TP. Vũng Tàu',
      villa_map_link: 'https://maps.app.goo.gl/2BYgW3AkMpRccTAj8',
      total_guests: '12',
      adults: '10',
      children: '2',
      remaining_amount: '5.000.000đ',
    };

    Object.entries(mockData).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });

    return result;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3">
              <Settings className="text-orange-600" />
              Thiết lập & Cài đặt
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm mt-0.5">Quản lý thông tin tài khoản và cấu hình hệ thống</p>
          </div>
        </div>

        {/* Nút hành động bổ sung */}
        <div className="flex items-center gap-3">
          {['admin', 'owner'].includes(role || '') && (
            <button
              onClick={() => router.push('/settings/users')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              <Users size={16} />
              Quản lý nhân sự
            </button>
          )}

          {activeTab === 'template' && ['admin', 'owner'].includes(role || '') && (
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-xs ${saved
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-slate-900 text-white hover:bg-orange-600 shadow-slate-900/10'
                }`}
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : (saved ? <Check size={16} /> : <Save size={16} />)}
              {saved ? 'Đã lưu!' : 'Lưu mẫu tin'}
            </button>
          )}
        </div>
      </header>

      {/* Tabs thanh chọn */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-slate-950/20">
        <button
          onClick={() => handleTabChange('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User size={16} />
          Tài khoản của tôi
        </button>
        <button
          onClick={() => handleTabChange('security')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lock size={16} />
          Mật khẩu & Bảo mật
        </button>
        {['admin', 'owner'].includes(role || '') && (
          <button
            onClick={() => handleTabChange('template')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
            activeTab === 'template'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
          >
            <MessageSquare size={16} />
            Mẫu Xác nhận Cọc
          </button>
        )}
      </div>

      {/* Nội dung theo Tab */}
      <div className="mt-4">
        
        {/* --- TAB 1: THÔNG TIN CÁ NHÂN --- */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <User className="text-orange-600" size={20} />
                Thông tin cá nhân
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-0.5">Cập nhật họ tên và số điện thoại liên lạc nội bộ của bạn</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Họ và Tên</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-12 pr-4 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Số điện thoại liên lạc</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-12 pr-4 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Email liên kết (Không thể đổi)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-12 pr-4 text-xs md:text-sm font-semibold text-slate-400 dark:text-slate-500 outline-none select-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                >
                  {profileSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- THEME SWITCHER --- */}
        {activeTab === 'profile' && (
          <ThemeSwitcherSection />
        )}

        {/* --- KHU VỰC THÔNG TIN STARTUP & CHUYỂN NHƯỢNG CHO OWNER --- */}
        {activeTab === 'profile' && (role === 'owner' || role === 'admin') && (
          <StartupManagementSection />
        )}

        {/* --- TAB 2: ĐỔI MẬT KHẨU --- */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Lock className="text-orange-600" size={20} />
                Đổi mật khẩu tài khoản
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-0.5">Đặt lại mật khẩu bảo mật mới cho tài khoản của bạn</p>
            </div>

            <form onSubmit={handleSaveSecurity} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Mật khẩu mới</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-12 pr-12 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-3 text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Xác nhận mật khẩu mới</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu giống hệt phía trên"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-12 pr-12 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3 text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={securitySaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                >
                  {securitySaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 3: MẪU TIN NHẮN (Được giữ nguyên giao diện cũ cực đẹp) --- */}
        {activeTab === 'template' && ['admin', 'owner'].includes(role || '') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Editor Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-slate-950/30 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="text-indigo-500" size={20} />
                    Mẫu Xác nhận Tiền cọc
                  </h2>
                  <button
                    onClick={() => {
                      showConfirmModal({
                        title: 'Khôi phục mặc định?',
                        message: 'Toàn bộ nội dung hiện tại sẽ bị thay thế bằng mẫu mặc định. Bạn có muốn tiếp tục?',
                        onConfirm: () => {
                          setTemplate(DEFAULT_TEMPLATE);
                          showToast('Đã khôi phục mẫu mặc định');
                        }
                      })
                    }}
                    className="text-slate-400 dark:text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1.5 text-xs font-bold w-fit cursor-pointer"
                  >
                    <RotateCcw size={14} /> Khôi phục mặc định
                  </button>
                </div>

                {loading ? (
                  <div className="py-20 flex justify-center items-center">
                    <Loader2 className="text-orange-500 animate-spin" size={32} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mr-2">
                          <button onClick={() => transformSelection('bold')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer" title="Chữ Đậm (Ctrl+B)"><Bold size={16} /></button>
                          <button onClick={() => transformSelection('italic')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 italic hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer" title="Chữ Nghiêng (Ctrl+I)"><Italic size={16} /></button>
                          <button onClick={() => transformSelection('underline')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline decoration-2 underline-offset-4 cursor-pointer" title="Gạch chân (Ctrl+U)"><UnderlineIcon size={16} /></button>
                          <div className="w-[1px] h-4 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                          <button onClick={() => transformSelection('uppercase')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer" title="IN HOA (Ctrl+Shift+U)"><CaseSensitive size={18} /></button>

                          <div className="relative">
                            <button
                              onClick={() => setShowBullets(!showBullets)}
                              className={`p-2 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer ${showBullets ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                              title="Danh sách đầu dòng"
                            >
                              <Type size={16} />
                              <ChevronDown size={10} className={`transition-transform ${showBullets ? 'rotate-180' : ''}`} />
                            </button>
                            {showBullets && (
                              <div className="absolute top-full left-0 mt-2 z-[110] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl dark:shadow-slate-950/40 p-1.5 w-[160px] animate-in zoom-in-95 duration-200">
                                {BULLET_TYPES.map(type => (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => { transformSelection('list', type.value); setShowBullets(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                                  >
                                    <span className="w-5 text-center bg-slate-100 dark:bg-slate-800 rounded text-[10px] py-0.5">{type.icon}</span>
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setShowEmoji(!showEmoji)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-bold cursor-pointer ${showEmoji ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <Smile size={16} /> Icon <ChevronDown size={12} className={`transition-transform ${showEmoji ? 'rotate-180' : ''}`} />
                          </button>
                          {showEmoji && (
                            <div className="absolute top-full left-0 mt-2 z-[100] shadow-2xl animate-in zoom-in-95 duration-200">
                              <div
                                className="fixed inset-0"
                                onClick={() => setShowEmoji(false)}
                              ></div>
                              <div className="relative">
                                <EmojiPicker
                                  onEmojiClick={onEmojiClick}
                                  autoFocusSearch={true}
                                  theme={Theme.DARK}
                                  searchPlaceholder="Tìm icon..."
                                  width={320}
                                  height={400}
                                  previewConfig={{ showPreview: false }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                          <Sparkles size={12} className="text-indigo-400" />
                          Biến tự động
                        </span>
                        <button
                          onClick={clearAllPlaceholders}
                          className="text-[11px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1.5 transition-colors w-fit cursor-pointer"
                        >
                          <Trash2 size={12} /> Xóa sạch các biến
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map((p) => (
                          <button
                            key={p.value}
                            onClick={() => insertPlaceholder(p.value, p.label)}
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative group">
                      <div
                        ref={editorRef}
                        id="template-editor"
                        contentEditable
                        onInput={(e) => setTemplate(htmlToTemplate(e.currentTarget.innerHTML))}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          const deleteBtn = target.closest('.delete-badge');
                          if (deleteBtn) {
                            target.closest('.variable-badge')?.remove();
                            if (editorRef.current) {
                              setTemplate(htmlToTemplate(editorRef.current.innerHTML));
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const text = e.clipboardData.getData('text/plain');
                          document.execCommand('insertText', false, text);
                        }}
                        onFocus={() => setShowEmoji(false)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-[550px] bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl p-8 text-slate-700 dark:text-slate-300 font-semibold text-xs md:text-sm leading-relaxed outline-none transition-all overflow-y-auto shadow-sm smart-editor"
                      />
                      <style jsx global>{`
                        .smart-editor .variable-badge {
                          display: inline-flex;
                          align-items: center;
                          background-color: #e0e7ff !important;
                          color: #4338ca !important;
                          border: 1px solid #c7d2fe !important;
                          border-radius: 6px !important;
                          padding: 2px 8px !important;
                          margin: 0 4px !important;
                          font-size: 11px !important;
                          font-weight: 700 !important;
                          line-height: 1.5 !important;
                          user-select: none !important;
                          cursor: default !important;
                          vertical-align: baseline !important;
                        }
                        .smart-editor .delete-badge {
                          display: inline-flex !important;
                          align-items: center;
                          justify-content: center;
                          width: 14px;
                          height: 14px;
                          border-radius: 4px;
                          cursor: pointer !important;
                        }
                        .smart-editor b, .smart-editor strong {
                          font-weight: 800;
                          color: #0f172a;
                        }
                        .smart-editor i, .smart-editor em {
                          font-style: italic;
                          color: #334155;
                        }
                      `}</style>
                      <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest pointer-events-none">
                        Smart Template Editor
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Side */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-slate-950/30 space-y-6 sticky top-28">
                <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-4">
                  <Sparkles className="text-orange-500" size={20} />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Xem trước (Preview)</h2>
                </div>

                <div className="bg-orange-50/20 dark:bg-orange-950/10 rounded-2xl p-6 border border-orange-100/50 dark:border-orange-900/20">
                  <div className="whitespace-pre-wrap text-xs md:text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed font-sans">
                    {renderPreview()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const SettingsPage = () => {
  return (
    <Suspense
      fallback={(
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      )}
    >
      <SettingsPageContent />
    </Suspense>
  );
};

export default SettingsPage;
