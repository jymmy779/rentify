'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { DollarSign, Save, ChevronLeft, ChevronRight, TrendingUp, Info, AlertCircle, Loader2, Calendar as CalendarIcon, Hotel } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { canManageVillas } from '@/lib/permissions';

// Helper function to enforce promise timeout
const promiseTimeout = <T = any>(promise: PromiseLike<T> | any, ms: number, errorMsg = 'Yêu cầu quá thời gian phản hồi.'): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const PricingPageContent = () => {
  const { role, logout, profile, loading: authLoading } = useAuth();
  const canManage = canManageVillas(role);
  const searchParams = useSearchParams();
  const urlVillaId = searchParams.get('villaId');

  const [villas, setVillas] = useState<Villa[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyPrices, setMonthlyPrices] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingValue, setEditingValue] = useState<{ key: string; val: string } | null>(null);
  const { showToast } = useNotification();

  useEffect(() => {
    if (profile?.tenant_id) {
      const controller = new AbortController();
      fetchVillas(controller.signal);
      return () => {
        controller.abort();
      };
    }
  }, [profile]);

  const fetchVillas = async (signal?: AbortSignal) => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      
      // Kiểm tra session trước khi fetch bằng cách bọc getSession vào promiseTimeout
      const { data: { session } } = await promiseTimeout(
        supabase.auth.getSession(),
        5000,
        'Không thể kiểm tra phiên đăng nhập.'
      );
      
      const now = Math.floor(Date.now() / 1000);
      // Chỉ tự động đăng xuất nếu session thực sự đã hết hạn và trước đó user đang trong trạng thái đăng nhập
      if (!session || (session.expires_at && session.expires_at < now + 5)) {
        // Nếu user trong context đã null (nghĩa là đã chủ động đăng xuất), ta không bắn thông báo session hết hạn nữa
        if (supabase.auth.getUser() !== null) {
          console.warn('[PricingPage] ⚠️ Session hết hạn hoặc không tồn tại, tiến hành đăng xuất...');
          showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!', 'error');
        }
        await logout();
        return;
      }

      const query = supabase
        .from('villas')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'inactive');
      
      if (signal) {
        query.abortSignal(signal);
      }

      const { data, error } = await promiseTimeout(
        query,
        10000,
        'Lấy danh sách Villa quá hạn (10s). Vui lòng tải lại trang!'
      );

      if (error) {
        // Bỏ qua lỗi nếu do abort
        if (error.name === 'AbortError' || (error as any).message?.includes('AbortError')) {
          return;
        }
        console.error('[PricingPage] ❌ Lỗi khi tải danh sách Villa:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setVillas(data);
        // Ưu tiên villa từ URL param (khi navigate từ trang villa detail), không thì chọn villa đầu tiên
        const targetVilla = urlVillaId && data.find((v: Villa) => v.id === urlVillaId)
          ? data.find((v: Villa) => v.id === urlVillaId)!
          : data[0];
        setSelectedVillaId(targetVilla.id);
        setMonthlyPrices(targetVilla.monthly_prices || []);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        return;
      }
      console.error('[PricingPage] 💥 Lỗi bắt ngoại lệ fetchVillas:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVilla = villas.find(v => v.id === selectedVillaId);

  useEffect(() => {
    if (selectedVilla) {
      setMonthlyPrices(selectedVilla.monthly_prices || []);
    }
  }, [selectedVillaId]);

  const getPriceForMonth = (month: number) => {
    return monthlyPrices.find(p => p.month === month && p.year === selectedYear);
  };

  const handlePriceChange = (month: number, type: 'weekday' | 'friday' | 'weekend' | 'sunday', inputVal: string, inputElement: HTMLInputElement) => {
    const key = `${month}-${type}`;
    
    // Đếm số chữ số trước con trỏ để giữ vị trí
    const cursorPosition = inputElement.selectionStart || 0;
    const digitsBeforeCursor = inputVal.substring(0, cursorPosition).replace(/\D/g, '').length;

    // Loại bỏ tất cả ký tự phi số trừ khi ô trống
    let digits = inputVal.replace(/\D/g, '');
    
    // Nếu người dùng xóa hết (ô trống), cho phép ô trống hoàn toàn
    if (digits === '') {
      setEditingValue({ key, val: '' });
      
      const newPrices = [...monthlyPrices];
      const index = newPrices.findIndex(p => p.month === month && p.year === selectedYear);
      if (index >= 0) {
        if (type === 'weekday') newPrices[index].weekday_price = 0;
        else if (type === 'friday') newPrices[index].friday_price = 0;
        else if (type === 'weekend') newPrices[index].weekend_price = 0;
        else if (type === 'sunday') newPrices[index].sunday_price = 0;
        setMonthlyPrices(newPrices);
      }
      return;
    }

    // Nếu chuỗi số chỉ toàn số 0 và độ dài lớn hơn 1 (ví dụ '000000' sau khi xóa số 4 của '4.000.000')
    // Ta cho phép giữ lại chuỗi đó mà không gán thành '0' để người dùng gõ số tiếp theo vào trước nó
    let formattedVal = '';
    if (/^0+$/.test(digits) && digits.length > 1) {
      // Giữ định dạng hiển thị với các dấu chấm để người dùng không bị mất các số 0
      formattedVal = digits.split('').map((char, index) => {
        const revIndex = digits.length - 1 - index;
        return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
      }).join('');
    } else {
      // Loại bỏ số 0 dư thừa ở đầu nếu có số khác đằng sau (ví dụ '05' thành '5')
      digits = digits.replace(/^0+/, '') || '0';
      formattedVal = new Intl.NumberFormat('vi-VN').format(Number(digits));
    }

    setEditingValue({ key, val: formattedVal });

    const amount = Number(digits.replace(/^0+/, '')) || 0;
    
    const newPrices = [...monthlyPrices];
    const index = newPrices.findIndex(p => p.month === month && p.year === selectedYear);
    
    if (index >= 0) {
      if (type === 'weekday') newPrices[index].weekday_price = amount;
      else if (type === 'friday') newPrices[index].friday_price = amount;
      else if (type === 'weekend') newPrices[index].weekend_price = amount;
      else if (type === 'sunday') newPrices[index].sunday_price = amount;
    } else {
      const newItem: any = { 
        month, 
        year: selectedYear,
        weekday_price: type === 'weekday' ? amount : 5000000,
        friday_price: type === 'friday' ? amount : 5000000,
        weekend_price: type === 'weekend' ? amount : 7000000,
        sunday_price: type === 'sunday' ? amount : 5000000
      };
      newPrices.push(newItem);
    }
    setMonthlyPrices(newPrices);

    // Khôi phục con trỏ thông minh
    setTimeout(() => {
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formattedVal.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formattedVal[i])) digitsFound++;
        newPos = i + 1;
      }
      inputElement.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedVillaId || !profile?.tenant_id) {
      console.warn('[PricingPage] Không thể lưu vì selectedVillaId hoặc tenant_id rỗng');
      showToast('Không tìm thấy thông tin Startup (tenant_id).', 'error');
      return;
    }
    console.log('[PricingPage] 🚀 Bắt đầu gọi handleSave...');
    try {
      setSaving(true);
      
      // 1. Kiểm tra session trước khi gọi database để tránh treo vô hạn do refresh token lỗi
      console.log('[PricingPage] 🔑 Đang kiểm tra session của người dùng...');
      const { data: { session }, error: sessionError } = await promiseTimeout(
        supabase.auth.getSession(),
        5000,
        'Không thể kiểm tra phiên đăng nhập.'
      );
      
      const now = Math.floor(Date.now() / 1000);
      if (sessionError || !session || (session.expires_at && session.expires_at < now + 5)) {
        console.error('[PricingPage] ❌ Session không hợp lệ hoặc đã hết hạn:', sessionError);
        showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!', 'error');
        await logout();
        return;
      }

      console.log('[PricingPage] 📡 Gửi request lên Supabase cho villa:', selectedVillaId);
      console.log('[PricingPage] 📦 Dữ liệu monthlyPrices gửi đi:', monthlyPrices);

      // Enforce a 10-second timeout on the Supabase update request
      const { data, error } = await promiseTimeout(
        supabase
          .from('villas')
          .update({ monthly_prices: monthlyPrices })
          .eq('id', selectedVillaId)
          .eq('tenant_id', profile.tenant_id)
          .select(),
        10000,
        'Kết nối đến máy chủ quá hạn (10s). Vui lòng kiểm tra lại mạng hoặc tải lại trang!'
      );

      console.log('[PricingPage] 📥 Kết quả trả về từ Supabase:', { data, error });

      if (error) {
        console.error('[PricingPage] ❌ Supabase trả về lỗi:', error);
        throw error;
      }
      
      setVillas(villas.map(v => v.id === selectedVillaId ? { ...v, monthly_prices: monthlyPrices } : v));
      showToast(`Đã cập nhật thành công bảng giá năm ${selectedYear}!`);
      console.log('[PricingPage] 🎉 Đã cập nhật thành công bảng giá!');
    } catch (error: any) {
      console.error('[PricingPage] 💥 Lỗi bắt ngoại lệ khi lưu bảng giá:', error);
      showToast(error?.message || 'Lỗi khi lưu bảng giá!', 'error');
    } finally {
      console.log('[PricingPage] 🏁 Hoàn thành block try-catch, setSaving(false)');
      setSaving(false);
    }
  };

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 mt-6 md:mt-8">
      {/* ── HEADER ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Title + Year picker */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Cấu hình giá</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-0.5">Quản lý giá theo loại ngày (Thường/Cuối tuần).</p>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm dark:shadow-slate-950/25 self-start transition-all duration-300">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-350 transition-all rounded-lg"><ChevronLeft size={16} /></button>
            <div className="px-4 py-1 flex flex-col items-center min-w-15">
              <span className="text-[10px] font-semibold text-orange-500 leading-none mb-0.5 uppercase tracking-wider">Năm</span>
              <span className="text-base font-bold text-slate-900 dark:text-white leading-none">{selectedYear}</span>
            </div>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-350 transition-all rounded-lg"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Right: Save button / Read-only badge */}
        {canManage ? (
          <button
            onClick={handleSave}
            disabled={saving || !selectedVillaId}
            className="bg-slate-900 dark:bg-slate-800 border dark:border-slate-700/55 text-white hover:bg-emerald-600 dark:hover:bg-emerald-600 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md dark:shadow-slate-950/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            Lưu bảng giá {selectedYear}
          </button>
        ) : (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 text-orange-700 dark:text-orange-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold self-start">
            <AlertCircle size={13} className="text-orange-500 shrink-0" />
            Chế độ Chỉ xem (Read-only)
          </div>
        )}
      </header>

      {/* ── VILLA TABS ── */}
      {villas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-100 dark:border-slate-800/80 -mx-0.5 px-0.5">
          {villas.map((villa) => (
            <button
              key={villa.id}
              onClick={() => setSelectedVillaId(villa.id)}
              className={`shrink-0 px-4 py-2 rounded-t-xl font-semibold text-sm transition-all border-b-2 ${
                selectedVillaId === villa.id
                  ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              {villa.name}
            </button>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {villas.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm dark:shadow-slate-950/30 transition-all">
          <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs">Chưa có Villa nào để cấu hình giá</p>
        </div>
      )}

      {selectedVilla && (
        <>
          {/* ══════════════════════════════════════
              DESKTOP TABLE  (md trở lên)
          ══════════════════════════════════════ */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm dark:shadow-slate-950/30 overflow-hidden w-full transition-all duration-300">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-350 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 pl-2">Tháng</th>
                  <th className="py-3 hidden lg:table-cell">Mùa vụ</th>
                  <th className="py-3 text-center">Thứ 2 – 5</th>
                  <th className="py-3 text-center">Thứ 6</th>
                  <th className="py-3 text-center">Thứ 7</th>
                  <th className="py-3 text-center">Chủ Nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {months.map((month) => {
                  const seasonal = getPriceForMonth(month);
                  const isPeak = [6, 7, 8].includes(month);
                  const now = new Date();
                  const currentMonth = now.getMonth() + 1;
                  const currentYear = now.getFullYear();
                  const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);

                  const displayWeekday = seasonal ? seasonal.weekday_price.toLocaleString('vi-VN') : (isPast ? '' : '5.000.000');
                  const displayFriday = seasonal
                    ? (seasonal.friday_price !== undefined && seasonal.friday_price !== null
                        ? seasonal.friday_price.toLocaleString('vi-VN')
                        : seasonal.weekday_price.toLocaleString('vi-VN'))
                    : (isPast ? '' : '5.000.000');
                  const displayWeekend = seasonal ? seasonal.weekend_price.toLocaleString('vi-VN') : (isPast ? '' : '7.000.000');
                  const displaySunday = seasonal
                    ? (seasonal.sunday_price !== undefined && seasonal.sunday_price !== null
                        ? seasonal.sunday_price.toLocaleString('vi-VN')
                        : seasonal.weekday_price.toLocaleString('vi-VN'))
                    : (isPast ? '' : '5.000.000');

                  return (
                    <tr key={month} className={`group ${isPast ? 'opacity-40 dark:opacity-30' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all duration-200`}>
                      <td className="py-4 pl-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 text-base leading-tight">T{month}</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{selectedYear}</p>
                      </td>
                      <td className="py-4 hidden lg:table-cell">
                        {isPeak ? (
                          <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-xs font-semibold border border-red-100 dark:border-red-900/40">🔥 Cao điểm</span>
                        ) : (
                          <span className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded text-xs font-semibold border border-slate-100 dark:border-slate-800">Thường</span>
                        )}
                      </td>
                      {/* T2–T5 */}
                      <td className="py-4 px-2">
                        <div className={`flex items-center border rounded-xl p-0.5 transition-all ${!canManage ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-500'}`}>
                          <span className="pl-1.5 text-slate-300 dark:text-slate-600 font-semibold text-xs">đ</span>
                          <input type="text" disabled={isPast || !canManage}
                            className={`bg-transparent border-none py-1.5 text-right font-semibold w-full outline-none text-xs ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                            value={editingValue?.key === `${month}-weekday` ? editingValue.val : displayWeekday}
                            onFocus={() => setEditingValue({ key: `${month}-weekday`, val: displayWeekday })}
                            onBlur={() => setEditingValue(null)}
                            onChange={(e) => handlePriceChange(month, 'weekday', e.target.value, e.target)}
                          />
                        </div>
                      </td>
                      {/* Thứ 6 */}
                      <td className="py-4 px-2">
                        <div className={`flex items-center border rounded-xl p-0.5 transition-all ${!canManage ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-500'}`}>
                          <span className="pl-1.5 text-slate-300 dark:text-slate-600 font-semibold text-xs">đ</span>
                          <input type="text" disabled={isPast || !canManage}
                            className={`bg-transparent border-none py-1.5 text-right font-semibold w-full outline-none text-xs ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                            value={editingValue?.key === `${month}-friday` ? editingValue.val : displayFriday}
                            onFocus={() => setEditingValue({ key: `${month}-friday`, val: displayFriday })}
                            onBlur={() => setEditingValue(null)}
                            onChange={(e) => handlePriceChange(month, 'friday', e.target.value, e.target)}
                          />
                        </div>
                      </td>
                      {/* Thứ 7 */}
                      <td className="py-4 px-2">
                        <div className={`flex items-center border rounded-xl p-0.5 transition-all ${!canManage ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                          <span className="pl-1.5 text-indigo-300 dark:text-indigo-500 font-semibold text-xs">đ</span>
                          <input type="text" disabled={isPast || !canManage}
                            className={`bg-transparent border-none py-1.5 text-right font-semibold w-full outline-none text-xs ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-indigo-650 dark:text-indigo-400'}`}
                            value={editingValue?.key === `${month}-weekend` ? editingValue.val : displayWeekend}
                            onFocus={() => setEditingValue({ key: `${month}-weekend`, val: displayWeekend })}
                            onBlur={() => setEditingValue(null)}
                            onChange={(e) => handlePriceChange(month, 'weekend', e.target.value, e.target)}
                          />
                        </div>
                      </td>
                      {/* Chủ Nhật */}
                      <td className="py-4 px-2">
                        <div className={`flex items-center border rounded-xl p-0.5 transition-all ${!canManage ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-500'}`}>
                          <span className="pl-1.5 text-slate-300 dark:text-slate-600 font-semibold text-xs">đ</span>
                          <input type="text" disabled={isPast || !canManage}
                            className={`bg-transparent border-none py-1.5 text-right font-semibold w-full outline-none text-xs ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                            value={editingValue?.key === `${month}-sunday` ? editingValue.val : displaySunday}
                            onFocus={() => setEditingValue({ key: `${month}-sunday`, val: displaySunday })}
                            onBlur={() => setEditingValue(null)}
                            onChange={(e) => handlePriceChange(month, 'sunday', e.target.value, e.target)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════
              MOBILE CARD LAYOUT  (< md)
              Mỗi tháng = 1 card, inputs dạng 2×2
          ══════════════════════════════════════ */}
          <div className="md:hidden space-y-3">
            {months.map((month) => {
              const seasonal = getPriceForMonth(month);
              const isPeak = [6, 7, 8].includes(month);
              const now = new Date();
              const currentMonth = now.getMonth() + 1;
              const currentYear = now.getFullYear();
              const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);

              const displayWeekday = seasonal ? seasonal.weekday_price.toLocaleString('vi-VN') : (isPast ? '' : '5.000.000');
              const displayFriday = seasonal
                ? (seasonal.friday_price !== undefined && seasonal.friday_price !== null
                    ? seasonal.friday_price.toLocaleString('vi-VN')
                    : seasonal.weekday_price.toLocaleString('vi-VN'))
                : (isPast ? '' : '5.000.000');
              const displayWeekend = seasonal ? seasonal.weekend_price.toLocaleString('vi-VN') : (isPast ? '' : '7.000.000');
              const displaySunday = seasonal
                ? (seasonal.sunday_price !== undefined && seasonal.sunday_price !== null
                    ? seasonal.sunday_price.toLocaleString('vi-VN')
                    : seasonal.weekday_price.toLocaleString('vi-VN'))
                : (isPast ? '' : '5.000.000');

              return (
                <div
                  key={month}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-all duration-300 ${isPast ? 'opacity-40 dark:opacity-30' : ''}`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-slate-900 dark:text-white">Tháng {month}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{selectedYear}</span>
                    </div>
                    {isPeak ? (
                      <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-red-100 dark:border-red-900/40">🔥 Cao điểm</span>
                    ) : (
                      <span className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-550 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-100 dark:border-slate-800">Thường</span>
                    )}
                  </div>

                  {/* 2×2 grid of price inputs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* T2–T5 */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Thứ 2 – 5</p>
                      <div className={`flex items-center border rounded-xl px-2.5 py-2 gap-1 transition-all ${!canManage ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-300'}`}>
                        <span className="text-slate-300 dark:text-slate-600 font-bold text-xs shrink-0">đ</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={isPast || !canManage}
                          className={`bg-transparent border-none text-right font-semibold w-full outline-none text-sm min-w-0 ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                          value={editingValue?.key === `${month}-weekday` ? editingValue.val : displayWeekday}
                          onFocus={() => setEditingValue({ key: `${month}-weekday`, val: displayWeekday })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'weekday', e.target.value, e.target)}
                        />
                      </div>
                    </div>

                    {/* Thứ 6 */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Thứ 6</p>
                      <div className={`flex items-center border rounded-xl px-2.5 py-2 gap-1 transition-all ${!canManage ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-300'}`}>
                        <span className="text-slate-300 dark:text-slate-600 font-bold text-xs shrink-0">đ</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={isPast || !canManage}
                          className={`bg-transparent border-none text-right font-semibold w-full outline-none text-sm min-w-0 ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                          value={editingValue?.key === `${month}-friday` ? editingValue.val : displayFriday}
                          onFocus={() => setEditingValue({ key: `${month}-friday`, val: displayFriday })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'friday', e.target.value, e.target)}
                        />
                      </div>
                    </div>

                    {/* Thứ 7 */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 mb-1.5 uppercase tracking-wider">Thứ 7</p>
                      <div className={`flex items-center border rounded-xl px-2.5 py-2 gap-1 transition-all ${!canManage ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-300'}`}>
                        <span className="text-indigo-300 dark:text-indigo-500 font-bold text-xs shrink-0">đ</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={isPast || !canManage}
                          className={`bg-transparent border-none text-right font-semibold w-full outline-none text-sm min-w-0 ${!canManage ? 'text-slate-400 dark:text-slate-550 cursor-not-allowed' : 'text-indigo-650 dark:text-indigo-400'}`}
                          value={editingValue?.key === `${month}-weekend` ? editingValue.val : displayWeekend}
                          onFocus={() => setEditingValue({ key: `${month}-weekend`, val: displayWeekend })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'weekend', e.target.value, e.target)}
                        />
                      </div>
                    </div>

                    {/* Chủ Nhật */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Chủ Nhật</p>
                      <div className={`flex items-center border rounded-xl px-2.5 py-2 gap-1 transition-all ${!canManage ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-300'}`}>
                        <span className="text-slate-300 dark:text-slate-600 font-bold text-xs shrink-0">đ</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={isPast || !canManage}
                          className={`bg-transparent border-none text-right font-semibold w-full outline-none text-sm min-w-0 ${!canManage ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                          value={editingValue?.key === `${month}-sunday` ? editingValue.val : displaySunday}
                          onFocus={() => setEditingValue({ key: `${month}-sunday`, val: displaySunday })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'sunday', e.target.value, e.target)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const PricingPage = () => {
  return (
    <Suspense
      fallback={(
        <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      )}
    >
      <PricingPageContent />
    </Suspense>
  );
};

export default PricingPage;
