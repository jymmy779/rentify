'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Booking, Villa, AdditionalService, MonthlyPrice } from '@/types';
import {
  ArrowLeft, Calendar, User, Phone, MapPin, DollarSign,
  CheckCircle2, Clock, Ban, ChevronRight, MessageSquare,
  Users, CreditCard, ShieldCheck, Printer, Trash2, Loader2, PackagePlus,
  Edit3, Save, X, Copy, Check, PlusCircle, RefreshCw, AlertTriangle, Info
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const BookingDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [villa, setVilla] = useState<Villa | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isManualDeposit, setIsManualDeposit] = useState(false);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateText, setTemplateText] = useState('');
  const [rawTemplate, setRawTemplate] = useState('');

  const [editForm, setEditForm] = useState<Partial<Booking>>({});

  const totalAmountRef = useRef<HTMLInputElement>(null);
  const depositAmountRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const { showToast, confirm: showConfirm } = useNotification();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchBookingDetail();
    }
  }, [id, profile]);

  const fetchBookingDetail = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data: bookingData, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (bError) throw bError;
      setBooking(bookingData);
      setEditForm(bookingData);

      if (bookingData) {
        const { data: villaData } = await supabase
          .from('villas')
          .select('*')
          .eq('id', bookingData.villa_id)
          .eq('tenant_id', profile.tenant_id)
          .single();
        setVilla(villaData);
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Không tìm thấy thông tin đơn đặt!', 'error');
      router.push('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (checkIn: string, checkOut: string) => {
    if (!villa || !checkIn || !checkOut || !profile?.tenant_id) return;
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, customer_name')
        .eq('villa_id', villa.id)
        .eq('tenant_id', profile.tenant_id)
        .neq('id', id)
        .neq('status', 'cancelled')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn);

      if (data && data.length > 0) {
        setConflictError(`Trùng lịch với khách: ${data[0].customer_name}`);
      } else {
        setConflictError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculate = useCallback(() => {
    if (isManualTotal) return;
    if (!villa || !editForm.check_in || !editForm.check_out) return;
    const start = new Date(editForm.check_in);
    const end = new Date(editForm.check_out);
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
    const servicesTotal = (editForm.additional_services || []).reduce((sum, s) => sum + s.price, 0);
    const grandTotal = total + servicesTotal;
    setEditForm(prev => ({ ...prev, total_amount: grandTotal, deposit_amount: isManualDeposit ? prev.deposit_amount : grandTotal / 2 }));
  }, [villa, editForm.check_in, editForm.check_out, editForm.additional_services, isManualDeposit, isManualTotal]);

  useEffect(() => {
    if (isEditing) {
      handleRecalculate();
      checkAvailability(editForm.check_in || '', editForm.check_out || '');
    }
  }, [editForm.check_in, editForm.check_out, isEditing, handleRecalculate]);

  const handleUpdate = async () => {
    if (!booking || conflictError || !profile?.tenant_id) return;
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('bookings')
        .update({ ...editForm })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);
      if (error) throw error;
      setBooking({ ...booking, ...editForm } as Booking);
      setIsEditing(false);
      showToast('Đã cập nhật thông tin thành công!');
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi cập nhật!', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!booking || !profile?.tenant_id) return;
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);
      if (error) throw error;
      setBooking({ ...booking, status: newStatus as any });
      showToast('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi cập nhật trạng thái!', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const fetchTemplate = async () => {
    if (!profile?.tenant_id) return null;
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'booking_confirmation_template')
        .eq('tenant_id', profile.tenant_id)
        .single();
      
      return data?.value || null;
    } catch (err) {
      return null;
    }
  };

  const generateConfirmationText = (template: string) => {
    if (!booking || !villa) return '';

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const remainingAmount = booking.total_amount - booking.deposit_amount;
    const totalGuests = (booking.adults || 0) + (booking.children || 0);

    const data = {
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      check_in: formatDate(booking.check_in),
      check_out: formatDate(booking.check_out),
      villa_name: villa.name,
      villa_address: villa.address,
      villa_map_link: villa.map_link || '',
      total_guests: totalGuests.toString(),
      adults: booking.adults.toString(),
      children: booking.children.toString(),
      remaining_amount: remainingAmount.toLocaleString('vi-VN') + 'đ',
    };

    let result = template;
    Object.entries(data).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });

    return result;
  };

  const handleOpenTemplate = async () => {
    if (!booking || !villa) return;
    
    let template = rawTemplate;
    if (!template) {
      const fetched = await fetchTemplate();
      if (fetched) {
        setRawTemplate(fetched);
        template = fetched;
      } else {
        // Mặc định để trống hoàn toàn đối với Startup mới chưa thiết lập mẫu
        template = "";
        setRawTemplate("");
      }
    }

    setTemplateText(generateConfirmationText(template));
    setShowTemplateModal(true);
  };

  const handleCopyFinal = () => {
    navigator.clipboard.writeText(templateText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowTemplateModal(false);
    }, 1500);
  };

  const formatMoney = (amount: number) => {
    if (amount === 0) return '';
    return amount.toLocaleString('vi-VN');
  };

  const handleMoneyChange = (field: 'total_amount' | 'deposit_amount', e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;

    // Đếm số chữ số trước con trỏ
    const cursorPosition = input.selectionStart || 0;
    const digitsBeforeCursor = value.substring(0, cursorPosition).replace(/\D/g, '').length;

    let digits = value.replace(/\D/g, '');

    // Nếu người dùng xóa hết, cho phép ô trống
    if (digits === '') {
      if (field === 'total_amount') {
        setEditForm(prev => ({ ...prev, total_amount: 0, deposit_amount: isManualDeposit ? prev.deposit_amount : 0 }));
        setIsManualTotal(true);
      } else {
        setEditForm(prev => ({ ...prev, deposit_amount: 0 }));
        setIsManualDeposit(true);
      }
      const targetInput = field === 'total_amount' ? totalAmountRef : depositAmountRef;
      if (targetInput.current) targetInput.current.value = '';
      return;
    }

    // Nếu toàn số 0 (xóa số đầu tiên), giữ định dạng không ép về 0
    let formatted: string;
    if (/^0+$/.test(digits) && digits.length > 1) {
      formatted = digits.split('').map((char, index) => {
        const revIndex = digits.length - 1 - index;
        return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
      }).join('');
    } else {
      digits = digits.replace(/^0+/, '') || '0';
      formatted = Number(digits).toLocaleString('vi-VN');
    }

    const numValue = Number(digits.replace(/^0+/, '')) || 0;

    if (field === 'total_amount') {
      setEditForm(prev => ({ ...prev, total_amount: numValue, deposit_amount: isManualDeposit ? prev.deposit_amount : Math.floor(numValue / 2) }));
      setIsManualTotal(true);
    } else {
      setEditForm(prev => ({ ...prev, deposit_amount: numValue }));
      setIsManualDeposit(true);
    }

    setTimeout(() => {
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        newPos = i + 1;
      }
      const targetInput = field === 'total_amount' ? totalAmountRef : depositAmountRef;
      if (targetInput.current) {
        targetInput.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const updateService = (index: number, field: keyof AdditionalService, value: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    const newServices = [...(editForm.additional_services || [])];
    if (field === 'price' && e) {
      const input = e.target;
      const val = input.value;
      const cursorPosition = input.selectionStart || 0;
      const digitsBeforeCursor = val.substring(0, cursorPosition).replace(/\D/g, '').length;

      let digits = val.replace(/\D/g, '');

      // Nếu xóa hết thì để trống
      if (digits === '') {
        newServices[index].price = 0;
        setEditForm({ ...editForm, additional_services: newServices });
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
    setEditForm({ ...editForm, additional_services: newServices });
  };

  if (authLoading) return null;
  if (loading) return <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300"><Loader2 className="text-orange-500 animate-spin" size={48} /></div>;
  if (!booking) return null;

  // ✨ Premium Dark Mode Status Badge Colors with Neon Glow
  const statusMap = {
    'deposited': { label: 'Đã đặt cọc', color: 'bg-emerald-500', icon: ShieldCheck, text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40' },
    'checked_in': { label: 'Đang lưu trú', color: 'bg-indigo-600', icon: Clock, text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-100 dark:border-indigo-900/40' },
    'completed': { label: 'Đã hoàn thành', color: 'bg-blue-600', icon: CheckCircle2, text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/40' },
    'cancelled': { label: 'Đã hủy đơn', color: 'bg-red-500', icon: Ban, text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-100 dark:border-red-900/40' }
  };

  const currentStatus = statusMap[booking.status as keyof typeof statusMap] || { label: 'Chờ xử lý', icon: Clock, text: 'text-slate-600 dark:text-slate-400' };

  // Logic kiểm tra ngày để khóa nút Check-in
  const isCheckInDisabled = booking.check_in > todayStr;
  
  // Đơn quá hạn chưa xử lý (quá ngày check_out mà vẫn deposited hoặc checked_in)
  const isOverdue = booking.check_out < todayStr && (booking.status === 'deposited' || booking.status === 'checked_in');
  
  // Đơn khách không đến (nếu hôm nay > check_out mà trạng thái deposited thì thường là no-show)
  const isNoShowPotential = booking.check_out < todayStr && booking.status === 'deposited';


  return (
    <div className="max-w-[1100px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-16 md:pb-24 mt-6 md:mt-8">
      {/* ═══ STICKY HEADER ═══ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800/80 mb-6 dark:shadow-slate-950/20">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-slate-950/20">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Chi tiết Phiếu đặt</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">Mã đơn: #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 shadow-sm dark:shadow-slate-950/20">
            <MessageSquare size={14} /> Mẫu xác nhận
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-600 dark:hover:bg-orange-600 transition-all shadow-md dark:shadow-slate-950/30">
              <Edit3 size={14} /> Sửa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl hover:text-slate-900 dark:hover:text-white transition-all"><X size={18} /></button>
              <button onClick={handleUpdate} disabled={updating || !!conflictError} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold text-sm shadow-lg dark:shadow-slate-950/30 disabled:opacity-50 transition-all active:scale-95"><Save size={14} /> Lưu</button>
            </div>
          )}
        </div>
      </header>

      {isEditing && isCheckInDisabled && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-4">
          <Info size={20} />
          <p className="text-sm font-bold italic">* Lưu ý: Để "Check-in sớm", bạn cần sửa ngày nhận phòng thành hôm nay ({todayStr}) rồi nhấn Lưu.</p>
        </div>
      )}

      {isOverdue && !isEditing && (
        <div className="p-4 md:p-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start md:items-center gap-3 text-red-600 dark:text-red-400 mb-6 shadow-sm">
          <AlertTriangle className="flex-shrink-0 mt-0.5 md:mt-0" size={24} />
          <div>
            <h3 className="font-bold text-sm md:text-base">⚠️ Đơn đặt này đã quá hạn!</h3>
            <p className="text-xs md:text-sm mt-1 text-red-500 dark:text-red-400">Khách đã qua ngày trả phòng ({booking.check_out}) nhưng đơn vẫn chưa được hoàn thành. Vui lòng cập nhật trạng thái thực tế.</p>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* ═══ LEFT COLUMN: Customer Info + Services ═══ */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 md:space-y-8 transition-all duration-300">
            {/* Status + Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Trạng thái</p>
                <div className={`flex items-center gap-2 md:gap-3 ${currentStatus.text}`}>
                  <currentStatus.icon size={20} className="md:w-6 md:h-6" />
                  <span className="text-lg md:text-xl font-semibold">{currentStatus.label}</span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex flex-wrap gap-2">
                  {booking.status === 'deposited' && !isNoShowPotential && (
                    <div className="relative group flex-1 md:flex-none">
                      <button
                        onClick={() => updateStatus('checked_in')}
                        disabled={updating || isCheckInDisabled}
                        className={`w-full md:w-auto bg-indigo-600 text-white px-5 md:px-6 text-nowrap py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md dark:shadow-slate-950/30 transition-all ${isCheckInDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95'}`}
                      >
                        {isCheckInDisabled ? 'Chưa tới ngày' : 'Check-in ngay'}
                      </button>
                    </div>
                  )}
                  {booking.status === 'deposited' && isNoShowPotential && (
                    <>
                      <button
                        onClick={() => { 
                          showConfirm({
                            title: 'Hoàn thành đơn?',
                            message: 'Khách đã đến nhưng bạn quên thao tác? Xác nhận hoàn thành đơn để tính doanh thu.',
                            onConfirm: () => updateStatus('completed')
                          })
                        }}
                        disabled={updating}
                        className="flex-1 md:flex-none bg-emerald-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md dark:shadow-slate-950/30 hover:bg-emerald-700 active:scale-95 transition-all text-nowrap"
                      >
                        Đã phục vụ
                      </button>
                      <button
                        onClick={() => { 
                          showConfirm({
                            title: 'Khách không đến?',
                            message: 'Xác nhận khách không đến và hủy đơn này?',
                            onConfirm: () => updateStatus('cancelled')
                          })
                        }}
                        disabled={updating}
                        className="flex-1 md:flex-none bg-red-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md dark:shadow-slate-950/30 hover:bg-red-700 active:scale-95 transition-all text-nowrap"
                      >
                        Khách không đến
                      </button>
                    </>
                  )}
                  {booking.status === 'checked_in' && (
                    <button onClick={() => updateStatus('completed')} disabled={updating} className="flex-1 md:flex-none bg-blue-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md dark:shadow-slate-950/30 hover:bg-blue-700 active:scale-95">Check-out</button>
                  )}
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && !isNoShowPotential && (
                    <button
                      onClick={() => { 
                        showConfirm({
                          title: 'Hủy đơn đặt?',
                          message: 'Bạn có chắc chắn muốn HỦY đơn đặt này không? Hành động này không thể hoàn tác.',
                          onConfirm: () => updateStatus('cancelled')
                        })
                      }}
                      disabled={updating}
                      className="flex-1 md:flex-none bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/40 px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-all"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Customer Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 py-6 md:py-8 border-y border-slate-50 dark:border-slate-800">
              <div className="space-y-6 md:space-y-8">
                {/* Customer Name & Phone */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl md:rounded-2xl flex-shrink-0"><User size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-0.5">Khách hàng</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2.5 rounded-xl font-medium border border-slate-100 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30" value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2.5 rounded-xl font-medium border border-slate-100 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30" value={editForm.customer_phone} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                      </div>
                    ) : (
                      <>
                        <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">{booking.customer_name}</p>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium mt-0.5 text-sm"><Phone size={12} /> {booking.customer_phone}</div>
                      </>
                    )}
                  </div>
                </div>
                {/* Villa Info */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl md:rounded-2xl flex-shrink-0"><MapPin size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-0.5">Căn lưu trú</p>
                    <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">{villa?.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5 truncate">{villa?.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                {/* Dates */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-xl md:rounded-2xl flex-shrink-0"><Calendar size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-0.5">Thời gian nghỉ</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2 rounded-lg text-sm font-medium outline-none border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-400/30" value={editForm.check_in} onChange={e => setEditForm({ ...editForm, check_in: e.target.value })} />
                        <input type="date" className="bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2 rounded-lg text-sm font-medium outline-none border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-400/30" value={editForm.check_out} onChange={e => setEditForm({ ...editForm, check_out: e.target.value })} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold mt-1">
                        <span className="bg-slate-900 dark:bg-slate-700 text-white px-2 py-1 rounded-lg text-xs">{booking.check_in}</span>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                        <span className="bg-slate-900 dark:bg-slate-700 text-white px-2 py-1 rounded-lg text-xs">{booking.check_out}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Capacity */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl md:rounded-2xl flex-shrink-0"><Users size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-0.5">Sức chứa</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2 rounded-lg font-medium outline-none border border-slate-100 dark:border-slate-800 text-sm focus:ring-2 focus:ring-indigo-400/30" value={editForm.adults} onChange={e => setEditForm({ ...editForm, adults: Number(e.target.value) })} />
                        <input type="number" className="bg-slate-50 dark:bg-slate-950 dark:text-slate-100 p-2 rounded-lg font-medium outline-none border border-slate-100 dark:border-slate-800 text-sm focus:ring-2 focus:ring-indigo-400/30" value={editForm.children} onChange={e => setEditForm({ ...editForm, children: Number(e.target.value) })} />
                      </div>
                    ) : (
                      <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">{booking.adults} Lớn, {booking.children} Trẻ em</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div className="space-y-5 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 text-slate-900 dark:text-white">
                  <PackagePlus size={20} className="text-emerald-500 md:w-6 md:h-6" />
                  <h3 className="font-semibold text-lg md:text-xl">Dịch vụ thêm</h3>
                </div>
                {isEditing && (
                  <button onClick={() => setEditForm({ ...editForm, additional_services: [...(editForm.additional_services || []), { name: '', price: 0 }] })} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all">Thêm mới</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                {(isEditing ? editForm.additional_services : booking.additional_services)?.map((service, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all duration-300">
                    {isEditing ? (
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <input type="text" placeholder="Tên dịch vụ..." className="flex-1 bg-white dark:bg-slate-950 dark:text-slate-100 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-400/30" value={service.name} onChange={e => { const s = [...(editForm.additional_services || [])]; s[idx].name = e.target.value; setEditForm({ ...editForm, additional_services: s }) }} />
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Giá tiền..." className="flex-1 md:w-32 bg-white dark:bg-slate-950 dark:text-emerald-400 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-right text-sm text-emerald-600 outline-none focus:ring-2 focus:ring-indigo-400/30" value={formatMoney(service.price)} onChange={e => updateService(idx, 'price', e.target.value, e)} />
                          <button onClick={() => { const s = [...(editForm.additional_services || [])]; s.splice(idx, 1); setEditForm({ ...editForm, additional_services: s }) }} className="p-2.5 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{service.name}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{service.price.toLocaleString()}đ</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Payment ═══ */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 transition-all duration-300">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Thanh toán
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-medium">
                <span className="text-sm flex items-center gap-1">
                  Tổng cộng
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setIsManualTotal(!isManualTotal)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isManualTotal ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}
                      title={isManualTotal ? "Đang khóa giá thủ công (Zalo Flow). Click để tự động tính lại theo hệ thống." : "Hệ thống tự động tính. Click để khóa giá."}
                    >
                      {isManualTotal ? <ShieldCheck size={14} className="text-orange-500" /> : <Clock size={14} />}
                    </button>
                  )}
                </span>
                {isEditing ? (
                  <div className="relative flex items-center">
                    <input 
                      ref={totalAmountRef} 
                      type="text" 
                      className={`w-24 md:w-32 p-2 pr-6 rounded-xl text-right font-semibold text-sm outline-none transition-all ${
                        isManualTotal 
                          ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400' 
                          : 'bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 text-slate-900 focus:ring-2 focus:ring-indigo-400/30'
                      }`} 
                      value={formatMoney(editForm.total_amount || 0)} 
                      onChange={e => handleMoneyChange('total_amount', e)} 
                    />
                    {isManualTotal && (
                      <span className="absolute right-2 text-xs" title="Đã khóa giá tự động">🔒</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">{booking.total_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="text-sm">Đã cọc</span>
                {isEditing ? (
                  <input ref={depositAmountRef} type="text" className="w-24 md:w-32 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 p-2 rounded-xl text-right font-semibold text-sm outline-none border border-emerald-100 dark:border-emerald-900/40 focus:ring-2 focus:ring-emerald-400/30" value={formatMoney(editForm.deposit_amount || 0)} onChange={e => handleMoneyChange('deposit_amount', e)} />
                ) : (
                  <span className="text-sm md:text-base">{booking.deposit_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {isEditing ? 'Cần thu thêm' : 
                    booking.status === 'completed' ? 'Đã thu (khi trả phòng)' : 
                    booking.status === 'cancelled' ? 'Chưa thu (Đã hủy)' : 'Cần thu thêm'}
                </span>
                <span className={`text-lg md:text-xl font-semibold ${
                  !isEditing && booking.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                  !isEditing && booking.status === 'cancelled' ? 'text-slate-400 dark:text-slate-500 line-through opacity-70' :
                  'text-orange-600 dark:text-orange-400'
                }`}>
                  {(Number(isEditing ? editForm.total_amount : booking.total_amount) - Number(isEditing ? editForm.deposit_amount : booking.deposit_amount)).toLocaleString()}đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PREMIUM DARK MODE TEMPLATE MODAL
      ═══════════════════════════════════════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl dark:shadow-slate-950/40 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Xác nhận nội dung</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bạn có thể chỉnh sửa nhanh trước khi chép</p>
                </div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <textarea
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                className="w-full h-[450px] bg-slate-50 dark:bg-slate-950 dark:text-slate-300 border-none rounded-2xl p-5 text-slate-700 font-medium text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all resize-none"
              />
            </div>

            <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button 
                onClick={handleCopyFinal}
                disabled={copied}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg dark:shadow-slate-950/30 active:scale-95 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-indigo-600 dark:hover:bg-indigo-600'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Đã sao chép!' : 'Chép nội dung'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailPage;