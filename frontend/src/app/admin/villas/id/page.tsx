'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { 
  ArrowLeft, MapPin, Users, Star, 
  CheckCircle2, Edit3, Calendar, 
  Map as MapIcon, Share2, Heart,
  Bath, Bed, Info, Loader2, ImageIcon, AlertCircle, Edit, DollarSign, Navigation, X
} from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const VillaDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchVilla();
    }
  }, [id, profile]);

  const fetchVilla = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (error) throw error;
      setVilla(data);
    } catch (error) {
      console.error('Error fetching villa:', error);
      setVilla(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!villa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <AlertCircle size={48} className="text-slate-200 mb-4" />
        <p className="text-xl font-semibold text-slate-900">Không tìm thấy Villa</p>
        <p className="text-slate-400 font-medium">Villa có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <button onClick={() => router.push('/villas')} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl">Quay lại danh sách</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-right duration-700 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors p-2"
        >
          <ArrowLeft size={20} />
          Quay lại
        </button>

        <div className="flex items-center gap-4">
          {villa.status === 'active' ? (
            <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-semibold border border-emerald-100">Đang kinh doanh</span>
          ) : villa.status === 'maintenance' ? (
            <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-semibold border border-orange-100 flex items-center gap-2"><AlertCircle size={12} /> Đang sửa chữa</span>
          ) : (
            <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200">Ngừng kinh doanh</span>
          )}

          <button 
            onClick={() => router.push(`/villas/edit/${id}`)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-semibold transition-all hover:bg-orange-600 shadow-xl shadow-slate-200"
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[600px] rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200 bg-slate-100 group">
        {villa.images && villa.images.length > 0 ? (
          <img 
            src={getOptimizedImageUrl(villa.images[activeImage], 1600)} 
            alt={villa.name} 
            className={`w-full h-full object-cover transition-all duration-1000 ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon size={64} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        
        {/* Gallery Preview in Hero */}
        <div className="absolute bottom-10 right-10 flex gap-3 p-3 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
          {villa.images?.slice(0, 5).map((img, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveImage(idx)}
              className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-orange-500 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={getOptimizedImageUrl(img, 200)} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <div className="absolute bottom-12 left-12 text-white">
          <div className="flex items-center gap-2 text-orange-400 font-medium text-sm mb-3">
            <MapPin size={16} />
            {villa.address}
          </div>
          <h1 className="text-7xl font-semibold leading-none mb-4">{villa.name}</h1>
          {villa.status === 'maintenance' && (
            <div className="mt-4 flex items-center gap-3 bg-orange-500/20 backdrop-blur-md border border-orange-500/50 px-6 py-3 rounded-2xl w-fit">
              <AlertCircle className="text-orange-400 animate-pulse" />
              <span className="font-medium text-sm text-orange-100">Đang trong quá trình bảo trì / sửa chữa</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-3xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-2 h-10 bg-orange-500 rounded-full"></div>
              Giới thiệu chung
            </h2>
            <div className="text-slate-600 leading-relaxed text-xl font-medium whitespace-pre-line">
              <p className={`transition-all ${showFullDescription ? '' : 'max-h-[8rem] overflow-hidden relative'}`}>
                {villa.description || 'Chưa có mô tả cho căn Villa này.'}
              </p>
              {!showFullDescription && (villa.description || '').length > 300 && (
                <div className="relative -mt-6 pointer-events-none">
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>
              )}

              {(villa.description || '').length > 300 && (
                <button
                  onClick={() => setShowFullDescription((s) => !s)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:underline"
                >
                  {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-slate-900 mb-8 flex items-center gap-3">
              <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
              Tiện ích đặc sắc
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {villa.amenities?.length > 0 ? villa.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="font-semibold text-slate-700 text-lg">{amenity}</span>
                </div>
              )) : (
                <p className="text-slate-400 italic">Chưa có tiện ích nào được liệt kê.</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl font-semibold text-slate-900">Hình ảnh thực tế</h2>
              <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-semibold">
                {villa.images?.length || 0} ẢNH
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {(villa.images || []).slice(0, showAllImages ? villa.images.length : 6).map((img, idx) => (
                <div key={idx} onClick={() => setZoomedImage(img)} className="h-64 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-zoom-in group relative">
                  <img 
                    src={getOptimizedImageUrl(img, 800)} 
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${villa.status === 'maintenance' ? 'grayscale opacity-60' : ''}`} 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
            </div>
            {(villa.images || []).length > 6 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAllImages((s) => !s)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  {showAllImages ? 'Thu gọn ảnh' : `Xem thêm ảnh (${villa.images.length - 6} còn lại)`}
                </button>
              </div>
            )}
          </section>

          <section className="pt-12 border-t border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
                <MapPin className="text-red-500" size={32} />
                Vị trí & Chỉ đường
              </h2>
              {villa.map_link && (
                <a 
                  href={villa.map_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-orange-600 transition-all shadow-xl shadow-slate-200"
                >
                  <Navigation size={20} /> Mở Google Maps
                </a>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 shadow-sm sticky top-8">
            <div className="text-center mb-10">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Thông tin căn</h3>
              <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-5">
              {villa.villa_details && villa.villa_details.length > 0 ? (
                villa.villa_details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.8rem] border border-transparent hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500 group-hover:scale-110 transition-all">
                        <Info size={18} />
                      </div>
                      <span className="font-medium text-xs text-slate-400">{detail.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900 text-lg">{detail.value}</span>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.8rem]">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500"><Users size={18} /></div>
                       <span className="font-medium text-xs text-slate-400">Sức chứa</span>
                    </div>
                    <span className="font-semibold text-slate-900 text-lg">{(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.8rem]">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500"><Bed size={18} /></div>
                       <span className="font-medium text-xs text-slate-400">Phòng ngủ</span>
                    </div>
                    <span className="font-semibold text-slate-900 text-lg">{villa.bedrooms} PN</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 pt-10 border-t border-slate-100 space-y-4">
               <button 
                onClick={() => router.push(`/pricing?villaId=${id}`)}
                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-semibold hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 group"
              >
                <DollarSign size={22} className="group-hover:rotate-12 transition-transform" />
                Cập nhật bảng giá
              </button>
              <p className="text-center text-slate-400 text-xs font-medium">Dữ liệu được bảo mật bởi Supabase</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
          <img
            src={zoomedImage}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in duration-300"
            alt="Zoomed"
          />
        </div>
      )}
    </div>
  );
};

export default VillaDetailPage;
