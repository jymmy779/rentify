'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Booking, Villa } from '@/types';
import { Search, Filter, Calendar, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const BookingsListPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const { showToast, confirm: showConfirm } = useNotification();

  // Đọc filter từ URL params để giữ nguyên khi Back từ trang chi tiết
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(0);
  const bookingsPerPage = 10;

  // Cập nhật URL khi thay đổi filter (không tạo history entry mới)
  const updateUrl = useCallback((q: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    const queryStr = params.toString();
    router.replace(`/bookings${queryStr ? `?${queryStr}` : ''}`, { scroll: false });
  }, [router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(0);
    updateUrl(val, statusFilter);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    setCurrentPage(0);
    updateUrl(searchTerm, val);
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const [bookingsRes, villasRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .neq('status', 'deleted')
          .order('check_in', { ascending: false }),
        supabase
          .from('villas')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (villasRes.error) throw villasRes.error;

      setBookings(bookingsRes.data || []);
      setVillas(villasRes.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm({
      title: 'Xóa đơn đặt?',
      message: 'Bạn có chắc chắn muốn xóa đơn này không? Đơn sẽ bị ẩn hoàn toàn khỏi hệ thống.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'deleted' })
            .eq('id', id);
          if (error) throw error;
          setBookings(prev => prev.filter(b => b.id !== id));
          showToast('Đã xóa đơn đặt thành công');
        } catch (error) {
          console.error('Error deleting booking:', error);
          showToast('Không thể xóa đơn này!', 'error');
        }
      }
    });
  };

  const removeAccents = (str: string) => {
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const filteredBookings = bookings.filter(b => {
    const normalizedSearch = removeAccents(searchTerm.toLowerCase());
    const normalizedName = removeAccents(b.customer_name.toLowerCase());
    const matchesSearch = normalizedName.includes(normalizedSearch) ||
                          b.customer_phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const currentBookings = filteredBookings.slice(currentPage * bookingsPerPage, (currentPage + 1) * bookingsPerPage);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'deposited': return { label: 'Đã cọc', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' };
      case 'checked_in': return { label: 'Đang ở', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40' };
      case 'completed': return { label: 'Hoàn thành', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40' };
      case 'cancelled': return { label: 'Đã hủy', color: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40' };
      default: return { label: 'Chờ cọc', color: 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800' };
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

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 pb-10 md:pb-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 mb-6 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-slate-950/20 active:scale-95 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Danh sách Đơn đặt</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">Theo dõi và quản lý toàn bộ luồng khách hàng từ Supabase.</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30 transition-all duration-300">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên khách hoặc SĐT..."
            className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border-none rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-11 pr-4 font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <select
            className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border-none rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-11 pr-4 font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500 appearance-none transition-all"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="deposited">Đã cọc</option>
            <option value="checked_in">Đang ở</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Booking List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm dark:shadow-slate-950/30 transition-all duration-300">
        {filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] md:min-w-0">
              <thead>
                <tr className="bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-350 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 md:py-4 pl-4 md:pl-6">Khách hàng</th>
                  <th className="py-3 md:py-4">Tên căn</th>
                  <th className="py-3 md:py-4">Thời gian</th>
                  <th className="py-3 md:py-4">Trạng thái</th>
                  <th className="py-3 md:py-4 pr-4 md:pr-6 text-right">Tổng cộng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {currentBookings.map((booking) => {
                  const villa = villas.find(v => v.id === booking.villa_id);
                  const status = getStatusLabel(booking.status);
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
                    >
                      <td className="py-3 md:py-4 pl-4 md:pl-6">
                        <p className="font-semibold text-slate-900 dark:text-slate-200 text-sm md:text-base leading-tight">{booking.customer_name}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-0.5">{booking.customer_phone}</p>
                      </td>
                      <td className="py-3 md:py-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{villa?.name || 'N/A'}</span>
                      </td>
                      <td className="py-3 md:py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 dark:text-slate-300">{booking.check_in}</span>
                          <span className="text-slate-200 dark:text-slate-700">→</span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 dark:text-slate-300">{booking.check_out}</span>
                        </div>
                      </td>
                      <td className="py-3 md:py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 md:py-4 text-right pr-4 md:pr-6">
                        <div className="flex items-center justify-end">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base">{Number(booking.total_amount).toLocaleString()}đ</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Hiển thị {currentPage * bookingsPerPage + 1}-{Math.min((currentPage + 1) * bookingsPerPage, filteredBookings.length)} trong tổng {filteredBookings.length} đơn
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-3">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 md:py-24 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700">
               <Calendar size={32} className="md:w-10 md:h-10" />
            </div>
            <div className="space-y-1 px-4">
              <p className="text-slate-900 dark:text-white font-semibold text-base md:text-lg">Không tìm thấy đơn đặt nào</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm font-medium">Hãy thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BookingsListPage = () => {
  return (
    <Suspense
      fallback={(
        <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      )}
    >
      <BookingsListPageContent />
    </Suspense>
  );
};

export default BookingsListPage;
