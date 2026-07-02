'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { ArrowLeft, Users, Bed, Bath, CheckCircle2, MapPin, Edit, ImageIcon, DollarSign, Navigation, AlertCircle, Loader2, Info, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOptimizedImageUrl } from '@/lib/utils';
import { canManageVillas } from '@/lib/permissions';


const VillaDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const canManage = canManageVillas(role);

  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  useEffect(() => {
    fetchVillaDetail();
  }, [id]);

  const fetchVillaDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setVilla(data);
    } catch (error) {
      console.error('Error fetching villa detail:', error);
    } finally {
      setLoading(false);
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

  if (!villa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 px-6 text-center">
        <AlertCircle size={40} className="text-slate-200 dark:text-slate-700 mb-4" />
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Không tìm thấy Villa</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Villa có thể đã bị xóa hoặc đường dẫn sai.</p>
        <button onClick={() => router.push('/villas')} className="mt-6 bg-slate-900 dark:bg-slate-800 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-slate-200/40 dark:shadow-slate-950/50">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right duration-700 pb-16 mt-6 md:mt-8">
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center m-0 bg-black/90 p-4" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
          <img src={getOptimizedImageUrl(zoomedImage, 1600)} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors p-1 text-sm"
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>

        {canManage && (
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push(`/villas/edit/${id}`)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-slate-100 dark:shadow-slate-950/40 cursor-pointer"
            >
              <Edit size={16} />
              <span className="hidden md:inline">Chỉnh sửa</span>
            </button>
          </div>
        )}

      </div>

      {/* Hero Section */}
      <div className="relative h-[280px] md:h-[450px] rounded-2xl md:rounded-3xl overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800">
        {villa.images && villa.images.length > 0 ? (
          <img src={getOptimizedImageUrl(villa.images[0], 1200)} alt={villa.name} className={`w-full h-full object-cover ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <ImageIcon size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 text-white pr-6">
          <div className="flex items-center gap-1.5 text-orange-400 font-medium text-sm mb-2">
            <MapPin size={14} />
            {villa.address}
          </div>
          <h1 className="text-2xl md:text-4xl font-semibold leading-tight">{villa.name}</h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {villa.status === 'active' ? (
              <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-lg text-xs font-medium border border-emerald-500/30">Đang kinh doanh</span>
            ) : villa.status === 'maintenance' ? (
              <span className="bg-orange-500/20 backdrop-blur-md text-orange-400 px-3 py-1 rounded-lg text-xs font-medium border border-orange-500/30 flex items-center gap-1.5"><AlertCircle size={10} /> Đang sửa chữa</span>
            ) : (
              <span className="bg-slate-500/20 backdrop-blur-md text-slate-300 px-3 py-1 rounded-lg text-xs font-medium border border-slate-500/30">Ngừng kinh doanh</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-12">
          <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              Giới thiệu chung
            </h2>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base font-medium whitespace-pre-line">
              <div className="relative">
                <p className={`transition-all ${showFullDescription ? '' : 'max-h-[12rem] overflow-hidden'}`}>
                  {villa.description || 'Chưa có mô tả cho căn Villa này.'}
                </p>

                {/* Gradient overlay only inside the text container so it does not cover the button */}
                {!showFullDescription && (villa.description || '').length > 600 && (
                  <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                )}
              </div>

              {(villa.description || '').length > 600 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowFullDescription((s) => !s)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:underline"
                  >
                    {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-4 md:mb-6">Tiện ích đặc sắc</h2>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
              {villa.amenities?.length > 0 ? villa.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-slate-950/30">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{amenity}</span>
                </div>
              )) : (
                <p className="text-slate-400 dark:text-slate-500 text-xs italic">Chưa có tiện ích nào được liệt kê.</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm dark:shadow-slate-950/30">
            <h3 className="text-base md:text-lg font-semibold mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              Thông tin chi tiết căn
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {villa.villa_details && villa.villa_details.length > 0 ? (
                villa.villa_details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-orange-200 dark:hover:border-orange-500/50 transition-all">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                      <CheckCircle2 size={14} className="text-orange-500" />
                      <span className="font-medium text-xs">{detail.label}</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{detail.value}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                      <Users size={16} />
                      <span className="font-medium text-sm">Sức chứa</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                      <Bed size={16} />
                      <span className="font-medium text-sm">Phòng ngủ</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{villa.bedrooms} PN</span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">Hình ảnh thực tế</h2>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs font-semibold">
                {villa.images?.length || 0} ẢNH
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {(villa.images || []).slice(0, showAllImages ? villa.images.length : 6).map((img, idx) => (
                <div key={idx} onClick={() => setZoomedImage(img)} className="h-40 md:h-56 rounded-xl md:rounded-[2rem] overflow-hidden shadow-sm dark:shadow-slate-950/30 hover:shadow-xl dark:hover:shadow-slate-950/60 transition-all cursor-zoom-in group">
                  <img src={getOptimizedImageUrl(img, 600)} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${villa.status === 'maintenance' ? 'grayscale' : ''}`} />
                </div>
              ))}
            </div>
            
            {(villa.images || []).length > 6 && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setShowAllImages((s) => !s)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {showAllImages ? 'Thu gọn ảnh' : `Xem thêm ảnh (${villa.images.length - 6} còn lại)`}
                </button>
              </div>
            )}
          </section>

          <section className="pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                <MapPin className="text-red-500" size={24} />
                Vị trí & Chỉ đường
              </h2>
              {villa.map_link && (
                <a
                  href={villa.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 dark:hover:bg-orange-600 hover:text-white transition-all"
                >
                  <Navigation size={16} /> Mở Bản đồ
                </a>
              )}
            </div>
            {villa.map_embed_url ? (
              <div className="w-full h-[300px] md:h-[400px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg dark:shadow-slate-950/30 relative group">
                <iframe
                  src={villa.map_embed_url}
                  className={`w-full h-full border-0 ${villa.status === 'maintenance' ? 'grayscale' : ''}`}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-400 dark:text-slate-500 font-medium text-sm italic">Bản đồ chưa được tích hợp.</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 md:sticky md:top-8">
            <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-6 text-center">Tác vụ quản trị</h3>

            <div className="space-y-3">
              <button
              onClick={() => router.push(`/pricing?villaId=${id}`)}
                className="w-full bg-orange-500 text-white py-3.5 md:py-4 rounded-xl font-semibold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 dark:shadow-orange-950/40 text-sm"
              >
                <DollarSign size={18} />
                Cài đặt bảng giá
              </button>

              {canManage && (
                <button
                  onClick={() => router.push(`/villas/edit/${id}`)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3.5 md:py-4 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Edit size={18} />
                  Chỉnh sửa thông tin
                </button>
              )}

            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 mb-4">
                <Info size={16} />
                <span className="text-sm font-medium">Lưu ý quản trị</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                Mọi thay đổi về thông tin căn sẽ ảnh hưởng trực tiếp đến dữ liệu hiển thị trên các phiếu đặt và lịch gối đầu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaDetailPage;
