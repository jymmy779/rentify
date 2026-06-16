'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { Plus, MapPin, Users, Bed, Eye, Edit, ImageIcon, AlertCircle, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOptimizedImageUrl } from '@/lib/utils';
import { canManageVillas } from '@/lib/permissions';

const VillaListPage = () => {
  const router = useRouter();
  const { role, profile, loading: authLoading } = useAuth();
  const canManage = canManageVillas(role);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const villasPerPage = 4; // Show 4 per page so it looks good on a 2x2 grid

  // Helper: find a detail value from villa.villa_details by matching label keywords
  const findDetailValue = (villa: Villa, keywords: string[]) => {
    const details = villa.villa_details || [];
    if (!details || details.length === 0) return null;
    const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const d of details) {
      const label = normalize(d.label || '');
      for (const k of keywords) {
        if (label.includes(normalize(k))) return d.value;
      }
    }
    return null;
  };

  // Normalize text helper (strip diacritics + lowercase)
  const normalizeText = (s: string | null | undefined) => (s || '').normalize?.('NFD')?.replace(/[\u0300-\u036f]/g, '').toLowerCase() || (s || '').toLowerCase();
  useEffect(() => {
    if (profile?.tenant_id) {
      fetchVillas();
    }
  }, [profile]);

  const fetchVillas = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVillas(data || []);
    } catch (error) {
      console.error('Error fetching villas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 md:pb-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Danh sách căn</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs md:text-sm font-medium">Quản lý và cập nhật trạng thái vận hành cho các căn.</p>
        </div>
        {canManage && (
          <Link 
            href="/villas/edit/new"
            className="bg-slate-900 dark:bg-slate-800 hover:bg-orange-600 dark:hover:bg-orange-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-semibold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span className="hidden md:inline">Thêm mới</span>
            <span className="md:hidden">Thêm</span>
          </Link>
        )}
      </header>

      {authLoading ? null : loading ? (
        <div className="min-h-[65vh] flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] transition-all duration-300">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      ) : villas.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {villas.slice(currentPage * villasPerPage, (currentPage + 1) * villasPerPage).map((villa) => (
            <div key={villa.id} className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30 group hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-950/50 transition-all duration-500 relative">
              
              <div className="absolute top-4 left-4 z-10">
                {villa.status === 'active' ? (
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg shadow-emerald-200/40 dark:shadow-emerald-950/50">Kinh doanh</span>
                ) : (
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg shadow-orange-200/40 dark:shadow-orange-950/50 flex items-center gap-1.5">
                    <AlertCircle size={10} /> Sửa chữa
                  </span>
                )}
              </div>

              <div className="relative h-48 md:h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                {villa.images && villa.images.length > 0 ? (
                  <img src={getOptimizedImageUrl(villa.images[0], 800)} alt={villa.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 dark:text-white shadow-sm flex items-center gap-1.5">
                  <ImageIcon size={12} />
                  {villa.images?.length || 0}
                </div>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-medium text-sm mb-1 line-clamp-1">
                  <MapPin size={12} className="text-orange-500" />
                  {villa.address}
                </div>
                <h2 className={`text-lg md:text-xl font-semibold mb-3 ${villa.status === 'maintenance' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{villa.name}</h2>

                <div className="flex items-center gap-4 mb-4 md:mb-6 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-slate-400 dark:text-slate-500" />
                    {(() => {
                      // Preferred: read from villa_details (labels like 'Sức chứa')
                      const capacityFromDetails = findDetailValue(villa, ['suc chua', 'Sức chứa', 'suc', 'capacity', 'succhua']);
                      if (capacityFromDetails) {
                        const norm = normalizeText(capacityFromDetails);
                        // if the value already mentions 'khach' or 'guest' or 'nguoi', don't append
                        if (norm.includes('khach') || norm.includes('guest') || norm.includes('nguoi')) return capacityFromDetails;
                        return `${capacityFromDetails} khách`;
                      }

                      const adults = villa.capacity?.adults ?? null;
                      const children = villa.capacity?.children ?? null;
                      const total = (adults ?? 0) + (children ?? 0);
                      return (adults === null && children === null) ? 'Chưa cập nhật' : `${total} khách`;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bed size={16} className="text-slate-400 dark:text-slate-500" />
                    {(() => {
                      const bedsFromDetails = findDetailValue(villa, ['phong ngu', 'phòng ngủ', 'phong', 'pn', 'bed', 'beds']);
                      if (bedsFromDetails) return `${bedsFromDetails} PN`;
                      return villa.bedrooms ? `${villa.bedrooms} PN` : 'Chưa cập nhật';
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 pt-4 md:pt-5 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/villas/${villa.id}`}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-sm text-center transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    Chi tiết
                  </Link>
                  {canManage && (
                    <Link
                      href={`/villas/edit/${villa.id}`}
                      className="p-2 md:p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg md:rounded-xl transition-colors group/btn cursor-pointer"
                    >
                      <Edit size={16} className="text-slate-400 dark:text-slate-500 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
          
          {Math.ceil(villas.length / villasPerPage) > 1 && (
            <div className="flex items-center justify-between p-4 md:p-5 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/30">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Hiển thị {currentPage * villasPerPage + 1}-{Math.min((currentPage + 1) * villasPerPage, villas.length)} trong tổng {villas.length} căn
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-3">
                  {currentPage + 1} / {Math.ceil(villas.length / villasPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(villas.length / villasPerPage) - 1, p + 1))}
                  disabled={currentPage >= Math.ceil(villas.length / villasPerPage) - 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-600">
            <Search size={48} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Chưa có Villa nào!</h2>
            <p className="text-slate-400 dark:text-slate-500 font-medium">Bấm vào nút phía trên để thêm căn Villa đầu tiên của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VillaListPage;
