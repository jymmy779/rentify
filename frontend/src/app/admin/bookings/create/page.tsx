'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa, Booking, MonthlyPrice, AdditionalService } from '@/types';
import { ArrowLeft, User, Calendar as CalendarIcon, Save, Plus, Calculator, AlertTriangle, Search, Loader2, Users, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CreateBookingPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();

  const villaIdFromUrl = searchParams.get('villaId') || '';
  const dateStr = searchParams.get('date') || '';

  const [villas, setVillas] = useState<Villa[]>([]);
  const [villaId, setVillaId] = useState(villaIdFromUrl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isManualDeposit, setIsManualDeposit] = useState(false);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [editingValue, setEditingValue] = useState<{ key: string; val: string } | null>(null);

  const [booking, setBooking] = useState({
    customerName: '',
    customerPhone: '',
    checkIn: dateStr,
    checkOut: '',
    adults: 10,
    children: 0,
    totalAmount: 0,
    depositAmount: 0,
    notes: '',
    additionalServices: [] as AdditionalService[]
  });

  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const totalAmountInputRef = useRef<HTMLInputElement>(null);
  const depositAmountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchVillas();
    }
  }, [profile]);

  const fetchVillas = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('villas')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'inactive');
      if (data && data.length > 0) {
        setVillas(data);
        if (!villaId) setVillaId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const villa = villas.find(v => v.id === villaId);

  const handleRecalculate = useCallback(() => {
    if (isManualTotal) return;
    if (!villa || !booking.checkIn || !booking.checkOut) return;

    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);

    if (end <= start) return;

    let total = 0;
    const current = new Date(start);

    while (current < end) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      const dayOfWeek = current.getDay();

      const priceConfig = villa.monthly_prices?.find((p: MonthlyPrice) => p.month === month && p.year === year);

      if (priceConfig) {
        let price = priceConfig.weekday_price;
        if (dayOfWeek === 6) {
          price = priceConfig.weekend_price;
        } else if (dayOfWeek === 5) {
          price = priceConfig.friday_price ?? priceConfig.weekday_price;
        } else if (dayOfWeek === 0) {
          price = priceConfig.sunday_price ?? priceConfig.weekday_price;
        }
        total += price;
      } else {
        total += villa.price || 5000000;
      }

      current.setDate(current.getDate() + 1);
    }

    // Cộng thêm tiền dịch vụ
    const servicesTotal = booking.additionalServices.reduce((sum, s) => sum + s.price, 0);
    const grandTotal = total + servicesTotal;

    setBooking(prev => ({
      ...prev,
      totalAmount: grandTotal,
      depositAmount: isManualDeposit ? prev.depositAmount : grandTotal / 2
    }));
  }, [villa, booking.checkIn, booking.checkOut, booking.additionalServices, isManualDeposit, isManualTotal]);

  useEffect(() => {
    handleRecalculate();
  }, [handleRecalculate]);

  useEffect(() => {
    if (villaId && booking.checkIn && booking.checkOut) {
      checkAvailability();
    }
  }, [booking.checkIn, booking.checkOut, villaId]);

  const checkAvailability = async () => {
    if (!profile?.tenant_id) return;
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('villa_id', villaId)
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'cancelled')
        .lt('check_in', booking.checkOut)
        .gt('check_out', booking.checkIn);

      if (data && data.length > 0) {
        setError("Cảnh báo: Dải ngày này đã có khách đặt trên hệ thống!");
      } else {
        setError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!profile?.tenant_id) {
      alert('Không tìm thấy thông tin Startup (tenant_id).');
      return;
    }
    try {
      setSaving(true);
      
      let finalNotes = booking.notes;
      if (isManualTotal && priceChangeReason.trim()) {
        const reasonTag = `[Lý do chỉnh giá: ${priceChangeReason.trim()}]`;
        finalNotes = finalNotes ? `${finalNotes}\n${reasonTag}` : reasonTag;
      }

      const { error } = await supabase
        .from('bookings')
        .insert([{
          villa_id: villaId,
          customer_name: booking.customerName,
          customer_phone: booking.customerPhone,
          check_in: booking.checkIn,
          check_out: booking.checkOut,
          adults: booking.adults,
          children: booking.children,
          total_amount: booking.totalAmount,
          deposit_amount: booking.depositAmount,
          notes: finalNotes,
          additional_services: booking.additionalServices,
          status: 'deposited',
          tenant_id: profile.tenant_id // Gán tenant_id cho đơn đặt phòng mới
        }]);

      if (error) throw error;
      alert('Đã tạo phiếu đặt thành công!');
      router.push('/calendar');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu phiếu đặt!');
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const handleMoneyChange = (field: 'totalAmount' | 'depositAmount', e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;

    // Đếm số chữ số trước con trỏ
    const cursorPosition = input.selectionStart || 0;
    const digitsBeforeCursor = value.substring(0, cursorPosition).replace(/\D/g, '').length;

    let digits = value.replace(/\D/g, '');

    // Nếu người dùng xóa hết, cho phép ô trống
    if (digits === '') {
      setEditingValue({ key: field, val: '' });
      if (field === 'totalAmount') {
        setBooking(prev => ({ ...prev, totalAmount: 0, depositAmount: isManualDeposit ? prev.depositAmount : 0 }));
        setIsManualTotal(true);
      } else {
        setBooking(prev => ({ ...prev, depositAmount: 0 }));
        setIsManualDeposit(true);
      }
      return;
    }

    // Nếu toàn số 0 (ví dụ xóa 4 khỏi 4.000.000 → 000000), giữ nguyên định dạng không ép về 0
    let formattedVal: string;
    if (/^0+$/.test(digits) && digits.length > 1) {
      // Định dạng thủ công với dấu chấm ngăn cách mà không ép về số 0
      formattedVal = digits.split('').map((char, index) => {
        const revIndex = digits.length - 1 - index;
        return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
      }).join('');
    } else {
      digits = digits.replace(/^0+/, '') || '0';
      formattedVal = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    setEditingValue({ key: field, val: formattedVal });

    const numValue = Number(digits.replace(/^0+/, '')) || 0;

    if (field === 'totalAmount') {
      setBooking(prev => ({ ...prev, totalAmount: numValue, depositAmount: isManualDeposit ? prev.depositAmount : Math.floor(numValue / 2) }));
      setIsManualTotal(true);
    } else {
      setBooking(prev => ({ ...prev, depositAmount: numValue }));
      setIsManualDeposit(true);
    }

    // Khôi phục con trỏ thông minh
    setTimeout(() => {
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formattedVal.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formattedVal[i])) digitsFound++;
        newPos = i + 1;
      }
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const addService = () => {
    setBooking({
      ...booking,
      additionalServices: [...booking.additionalServices, { name: '', price: 0 }]
    });
  };

  const removeService = (index: number) => {
    const newServices = [...booking.additionalServices];
    newServices.splice(index, 1);
    setBooking({ ...booking, additionalServices: newServices });
  };

  const updateService = (index: number, field: keyof AdditionalService, value: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    const newServices = [...booking.additionalServices];
    if (field === 'price' && e) {
      const input = e.target;
      const val = input.value;
      const cursorPosition = input.selectionStart || 0;
      const digitsBeforeCursor = val.substring(0, cursorPosition).replace(/\D/g, '').length;

      let digits = val.replace(/\D/g, '');

      // Nếu xóa hết thì để trống
      if (digits === '') {
        newServices[index].price = 0;
        setBooking({ ...booking, additionalServices: newServices });
        return;
      }

      // Nếu toàn số 0 (xóa chữ số đầu tiên), giữ định dạng không ép về 0
      let formatted: string;
      if (/^0+$/.test(digits) && digits.length > 1) {
        formatted = digits.split('').map((char, i) => {
          const revIndex = digits.length - 1 - i;
          return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
        }).join('');
      } else {
        digits = digits.replace(/^0+/, '') || '0';
        formatted = Number(digits).toLocaleString('vi-VN');
      }

      const numValue = Number(digits.replace(/^0+/, '')) || 0;
      newServices[index].price = numValue;

      setTimeout(() => {
        let newPos = 0;
        let digitsFound = 0;
        for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
          if (/\d/.test(formatted[i])) digitsFound++;
          newPos = i + 1;
        }
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      newServices[index].name = value;
    }
    setBooking({ ...booking, additionalServices: newServices });
  };

  const handleCapacityChange = (field: 'adults' | 'children', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setBooking({ ...booking, [field]: numValue });
  };

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-16 md:pb-24 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800/80 mb-6 dark:shadow-slate-950/20">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-slate-950/20">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Tạo Phiếu mới</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">Tên căn: {villa?.name}</p>
          </div>
        </div>
        <button
          disabled={!!error || !booking.checkOut || saving}
          onClick={handleSave}
          className="bg-slate-900 dark:bg-slate-800 text-white hover:bg-emerald-600 dark:hover:bg-emerald-600 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg dark:shadow-slate-950/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          Lưu phiếu đặt
        </button>
      </header>

      {error && (
        <div className="p-4 md:p-5 rounded-xl md:rounded-2xl flex items-center gap-3 border-2 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 animate-pulse">
          <AlertTriangle className="text-red-500" size={20} />
          <p className="font-semibold text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Thông tin khách */}
          <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">Thông tin khách</h3>
                <input type="text" placeholder="Tên khách hàng..." className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 border-none rounded-xl p-3.5 md:p-4 font-medium text-sm md:text-base dark:border" value={booking.customerName} onChange={e => setBooking({ ...booking, customerName: e.target.value })} />
                <input type="text" placeholder="Số điện thoại..." className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 border-none rounded-xl p-3.5 md:p-4 font-medium text-sm md:text-base dark:border" value={booking.customerPhone} onChange={e => setBooking({ ...booking, customerPhone: e.target.value })} />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 border-l-4 border-blue-500 pl-3">Thời gian & Sức chứa</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">Check-in</span>
                    <input type="date" min={today} className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 border-none rounded-lg md:rounded-xl p-2.5 md:p-3 font-semibold text-sm dark:border" value={booking.checkIn} onChange={e => setBooking({ ...booking, checkIn: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">Check-out</span>
                    <input type="date" min={booking.checkIn || today} className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 border-none rounded-lg md:rounded-xl p-2.5 md:p-3 font-semibold text-sm dark:border" value={booking.checkOut} onChange={e => setBooking({ ...booking, checkOut: e.target.value })} />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">Người lớn</span>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 dark:border-slate-800 rounded-lg md:rounded-xl px-3 md:px-4 py-2 dark:border">
                      <Users size={12} className="text-slate-400 dark:text-slate-500 mr-2" />
                      <input type="number" value={booking.adults === 0 ? '' : booking.adults} onChange={e => handleCapacityChange('adults', e.target.value)} className="bg-transparent dark:text-slate-100 border-none w-full font-semibold text-sm outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">Trẻ em</span>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 dark:border-slate-800 rounded-lg md:rounded-xl px-3 md:px-4 py-2 dark:border">
                      <Users size={12} className="text-slate-400 dark:text-slate-500 mr-2" />
                      <input type="number" value={booking.children === 0 ? '' : booking.children} onChange={e => handleCapacityChange('children', e.target.value)} className="bg-transparent dark:text-slate-100 border-none w-full font-semibold text-sm outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dịch vụ thêm */}
          <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Dịch vụ / Yêu cầu
              </h2>
              <button onClick={addService} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all">
                <PlusCircle size={14} /> Thêm
              </button>
            </div>

            {booking.additionalServices.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {booking.additionalServices.map((service, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-3 md:p-4 rounded-xl md:rounded-2xl animate-in zoom-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <input
                        type="text"
                        placeholder="Tên dịch vụ..."
                        className="flex-1 bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-xl px-3 md:px-4 py-2.5 text-sm font-medium"
                        value={service.name}
                        onChange={e => updateService(idx, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="VNĐ"
                          className="flex-1 md:w-32 bg-white dark:bg-slate-950 dark:text-emerald-400 border border-slate-100 dark:border-slate-700 rounded-xl px-3 md:px-4 py-2.5 text-sm font-semibold text-emerald-600 text-right"
                          value={formatMoney(service.price)}
                          onChange={e => updateService(idx, 'price', e.target.value, e)}
                        />
                        <button onClick={() => removeService(idx)} className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs italic font-medium">Bấm "Thêm mới" để ghi nhận dịch vụ phát sinh.</p>
            )}
          </div>

          {/* Phí dịch vụ & Thanh toán */}
          <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5"><Calculator className="text-indigo-500" size={18} /> Thanh toán</h2>
              <button
                onClick={handleRecalculate}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg cursor-pointer"
              >
                <RefreshCw size={14} /> Tính lại
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    Tổng cộng (VNĐ)
                    <button 
                      type="button" 
                      onClick={() => setIsManualTotal(!isManualTotal)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isManualTotal ? 'text-orange-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}
                      title={isManualTotal ? "Đang khóa giá thủ công (Zalo Flow). Click để mở khóa và tự động tính lại." : "Click để khóa giá thủ công."}
                    >
                      {isManualTotal ? <span className="text-[10px] text-orange-500">🔒 Khóa Zalo</span> : <span className="text-[10px] text-slate-400 dark:text-slate-400">🔓 Tự động</span>}
                    </button>
                  </label>
                  {isManualTotal && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsManualTotal(false);
                        setPriceChangeReason('');
                      }}
                      className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5"
                    >
                      <RefreshCw size={10} /> Reset
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    ref={totalAmountInputRef}
                    type="text"
                    className={`w-full border-2 rounded-xl p-3.5 md:p-4 font-semibold text-lg md:text-2xl outline-none transition-all shadow-inner ${isManualTotal ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-400' : 'bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 text-slate-900'}`}
                    value={editingValue?.key === 'totalAmount' ? editingValue.val : formatMoney(booking.totalAmount)}
                    onFocus={() => setEditingValue({ key: 'totalAmount', val: formatMoney(booking.totalAmount) })}
                    onBlur={() => setEditingValue(null)}
                    onChange={(e) => handleMoneyChange('totalAmount', e)}
                  />
                  {isManualTotal && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 text-lg">🔒</span>
                  )}
                </div>
                {isManualTotal && (
                  <div className="mt-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 ml-1">Lý do chỉnh giá (nhắn Zalo, bớt gần ngày...):</span>
                    <input 
                      type="text" 
                      placeholder="Nhập lý do thay đổi..." 
                      className="w-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-xs font-semibold text-orange-750 dark:text-orange-300 outline-none placeholder-orange-350 dark:placeholder-orange-600 focus:border-orange-400 dark:focus:border-orange-500"
                      value={priceChangeReason}
                      onChange={e => setPriceChangeReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-orange-400 dark:text-orange-400 ml-1">Tiền cọc (VNĐ)</label>
                <input
                  ref={depositAmountInputRef}
                  type="text"
                  className={`w-full bg-orange-50/50 dark:bg-orange-950/20 dark:text-orange-400 border-2 rounded-xl p-3.5 md:p-4 font-semibold text-orange-600 text-lg md:text-2xl outline-none transition-all shadow-inner ${isManualDeposit ? 'border-orange-500 dark:border-orange-600' : 'border-transparent focus:border-orange-200 dark:focus:border-orange-600'}`}
                  value={editingValue?.key === 'depositAmount' ? editingValue.val : formatMoney(booking.depositAmount)}
                  onFocus={() => setEditingValue({ key: 'depositAmount', val: formatMoney(booking.depositAmount) })}
                  onBlur={() => setEditingValue(null)}
                  onChange={e => handleMoneyChange('depositAmount', e)}
                />
                {isManualDeposit && <p className="text-[8px] font-bold text-orange-500 dark:text-orange-400 ml-1 italic">* Đã sửa tay</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3">Ghi chú</h3>
            <textarea className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 border-none rounded-xl p-4 text-slate-600 font-medium text-sm min-h-[120px] md:min-h-[200px] outline-none italic leading-relaxed" value={booking.notes} onChange={e => setBooking({ ...booking, notes: e.target.value })} placeholder="Thông tin thêm..." />
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateBookingPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    }>
      <CreateBookingPageContent />
    </Suspense>
  );
};

export default CreateBookingPage;