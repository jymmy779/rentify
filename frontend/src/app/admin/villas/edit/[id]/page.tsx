'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Plus, X, Upload, Image as ImageIcon, Trash2, CheckCircle2, Star, Info, AlertCircle, Power, MapPin, Loader2, ListTree, Camera, Eraser } from 'lucide-react';
import { VillaStatus, Villa, VillaDetailItem } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const VillaEditPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const isEdit = id && id !== 'new';

  // States
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VillaStatus>('active');
  const [amenities, setAmenities] = useState<string[]>(
    isEdit ? [] : ['Hồ bơi', 'Karaoke', 'Bida']
  );
  const [villaDetails, setVillaDetails] = useState<VillaDetailItem[]>(
    isEdit ? [] : [
      { label: 'Sức chứa', value: '15-25' },
      { label: 'Phòng ngủ', value: '5' }
    ]
  );
  const [mapLink, setMapLink] = useState('');
  const [previews, setPreviews] = useState<{ url: string; file?: File }[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  const [newAmenity, setNewAmenity] = useState('');
  const [newDetailLabel, setNewDetailLabel] = useState('');
  const [newDetailValue, setNewDetailValue] = useState('');

  const [bedrooms, setBedrooms] = useState(5);
  const [bathrooms, setBathrooms] = useState(6);
  const [capacity, setCapacity] = useState({ adults: 15, children: 5 });
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [monthlyPrices, setMonthlyPrices] = useState<any[]>([]);
  const { showToast, confirm: showConfirm } = useNotification();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && profile?.tenant_id) {
      fetchVilla();
    }
  }, [id, profile]);

  const fetchVilla = async () => {
    if (!profile?.tenant_id) return;
    try {
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name);
        setAddress(data.address);
        setDescription(data.description);
        setStatus(data.status);
        setAmenities(data.amenities || []);
        setVillaDetails(data.villa_details || []);
        setMapLink(data.map_link || '');

        // LỌC BỎ các link blob: cũ đã hỏng nếu có
        const initialImages = (data.images || [])
          .filter((url: string) => !url.startsWith('blob:'))
          .map((url: string) => ({ url }));

        setPreviews(initialImages);
        setBedrooms(data.bedrooms || 5);
        setBathrooms(data.bathrooms || 6);
        setCapacity(data.capacity || { adults: 15, children: 5 });
        setCoverIndex(0);
        setMonthlyPrices(data.monthly_prices || []);
      }
    } catch (error) {
      console.error('Error fetching villa:', error);
      showToast('Không tìm thấy Villa!', 'error');
      router.push('/villas');
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];

    for (const item of previews) {
      if (item.file) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `villa-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('villas')
          .upload(filePath, item.file);

        if (uploadError) {
          console.error('Lỗi upload:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('villas')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } else if (!item.url.startsWith('blob:')) {
        // Chỉ giữ lại những ảnh có URL thật (không phải blob)
        uploadedUrls.push(item.url);
      }
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const finalImageUrls = await uploadImages();

      if (coverIndex >= 0 && coverIndex < finalImageUrls.length) {
        const coverImg = finalImageUrls.splice(coverIndex, 1)[0];
        finalImageUrls.unshift(coverImg);
      }

      const villaData = {
        name,
        address,
        description,
        status,
        amenities,
        villa_details: villaDetails,
        map_link: mapLink,
        images: finalImageUrls,
        bedrooms,
        bathrooms,
        capacity,
        price: 5000000,
        monthly_prices: monthlyPrices,
        tenant_id: profile?.tenant_id // Gán tenant_id của người tạo
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('villas')
          .update(villaData)
          .eq('id', id)
          .eq('tenant_id', profile?.tenant_id);
      } else {
        result = await supabase
          .from('villas')
          .insert([villaData]);
      }

      if (result.error) throw result.error;

      showToast(isEdit ? 'Đã cập nhật thành công!' : 'Đã thêm Villa mới thành công!');
      router.push('/villas');
    } catch (error) {
      console.error('Error saving villa:', error);
      showToast('Có lỗi xảy ra khi lưu dữ liệu!', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const handleAddDetail = () => {
    if (newDetailLabel.trim() && newDetailValue.trim()) {
      setVillaDetails([...villaDetails, { label: newDetailLabel.trim(), value: newDetailValue.trim() }]);
      setNewDetailLabel('');
      setNewDetailValue('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newItems = Array.from(files).map(file => ({
        url: URL.createObjectURL(file),
        file: file
      }));
      setPreviews([...previews, ...newItems]);
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex(coverIndex - 1);
    }
  };

  const removeAllImages = () => {
    showConfirm({
      title: 'Xóa toàn bộ ảnh?',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ ảnh trong album này không?',
      onConfirm: () => {
        setPreviews([]);
        setCoverIndex(0);
        showToast('Đã xóa sạch album ảnh');
      }
    });
  };

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom duration-700 pb-24 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-slate-950/30">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">
              {isEdit ? `Chỉnh sửa căn` : 'Thêm căn mới'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">Cập nhật dữ liệu hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name}
            className="bg-slate-900 dark:bg-slate-800 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg dark:shadow-slate-950/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo căn')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
            <div className="flex items-center border-l-4 border-indigo-500 pl-4">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Trạng thái vận hành</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={() => setStatus('active')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'active' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}><Power size={20} /></div>
                <p className={`font-semibold text-sm ${status === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-300'}`}>Kinh doanh</p>
              </button>
              <button onClick={() => setStatus('maintenance')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'maintenance' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'maintenance' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}><AlertCircle size={20} /></div>
                <p className={`font-semibold text-sm ${status === 'maintenance' ? 'text-orange-700 dark:text-orange-400' : 'text-slate-900 dark:text-slate-300'}`}>Sửa chữa</p>
              </button>
              <button onClick={() => setStatus('inactive')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'inactive' ? 'border-slate-900 dark:border-slate-600 bg-slate-100 dark:bg-slate-700' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'inactive' ? 'bg-slate-900 dark:bg-slate-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}><Trash2 size={20} /></div>
                <p className={`font-semibold text-sm ${status === 'inactive' ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-slate-300'}`}>Ngừng bán</p>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 md:space-y-8">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white border-l-4 border-orange-500 pl-4">Thông tin giới thiệu</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">Tên căn</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Villa Blue Ocean Luxury" className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-medium text-sm md:text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">Địa chỉ / Khu vực</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Bãi Sau, Vũng Tàu" className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-medium text-sm md:text-base" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1.5"><MapPin size={12} className="text-orange-500" /> Google Maps</label>
              <input type="text" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="Dán link Maps vào đây..." className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-medium text-sm md:text-base" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">Mô tả chi tiết</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả không gian, tầm nhìn..." rows={6} className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-300 border-none rounded-xl p-4 md:p-6 focus:ring-2 focus:ring-orange-500 transition-all font-medium leading-relaxed text-sm md:text-base" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-blue-500 pl-4">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Hình ảnh căn</h2>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-0.5">Ảnh bìa là ảnh đầu tiên</p>
              </div>
              <div className="flex items-center gap-2">
                {previews.length > 0 && (
                  <button onClick={removeAllImages} className="bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/40"><Eraser size={14} /> Xóa album</button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 hover:bg-blue-700 transition-all shadow-md"><Camera size={14} /> Tải ảnh</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {previews.map((item, idx) => (
                <div key={idx} className={`relative aspect-[4/3] rounded-2xl overflow-hidden group border-2 transition-all shadow-sm dark:shadow-slate-950/30 ${coverIndex === idx ? 'border-orange-500 ring-4 ring-orange-50 dark:ring-orange-950/40' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                  <img
                    src={getOptimizedImageUrl(item.url, 400)}
                    alt="Preview"
                    onClick={() => setZoomedImage(item.url)}
                    className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 hover:scale-105"
                  />

                  <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                    <button
                      onClick={() => setCoverIndex(idx)}
                      className={`p-2 rounded-xl shadow-lg backdrop-blur-md transition-all ${coverIndex === idx ? 'bg-orange-500 text-white' : 'bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-orange-500'}`}
                    >
                      <Star size={14} fill={coverIndex === idx ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => removeImage(idx)}
                      className="p-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-red-500 rounded-xl shadow-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={() => fileInputRef.current?.click()} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-300 dark:text-slate-500 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-800/50">
                <Plus size={24} />
                <span className="text-sm font-semibold mt-1">Thêm ảnh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-1.5 h-6 md:h-7 bg-emerald-500 rounded-full"></div>
              Tiện ích
            </h2>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {amenities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 md:p-3.5 pl-4 rounded-xl group border border-transparent dark:border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center gap-3 flex-1">
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const updated = [...amenities];
                        updated[idx] = e.target.value;
                        setAmenities(updated);
                      }}
                      className="font-semibold text-sm text-slate-700 dark:text-slate-300 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full cursor-text"
                    />
                  </div>
                  <button onClick={() => setAmenities(amenities.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors opacity-100 flex-shrink-0 ml-2"><X size={16} /></button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddAmenity()} placeholder="Thêm tiện ích..." className="flex-1 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-lg p-2.5 text-sm font-medium" />
                <button onClick={handleAddAmenity} className="bg-slate-900 dark:bg-slate-800 text-white p-2.5 rounded-lg hover:bg-emerald-600 transition-all"><Plus size={16} /></button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-slate-950/30 space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-1.5 h-6 md:h-7 bg-blue-500 rounded-full"></div>
              Chi tiết căn
            </h2>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {villaDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 md:p-3.5 pl-4 rounded-xl group border border-transparent dark:border-transparent hover:border-blue-200 dark:hover:border-blue-500/50 transition-all">
                  <div className="flex items-center justify-between w-full pr-2 gap-3">
                    <input
                      type="text"
                      value={detail.label}
                      onChange={(e) => {
                        const updated = [...villaDetails];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setVillaDetails(updated);
                      }}
                      className="text-slate-400 dark:text-slate-500 font-medium text-xs bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-1/2 cursor-text"
                    />
                    <input
                      type="text"
                      value={detail.value}
                      onChange={(e) => {
                        const updated = [...villaDetails];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        setVillaDetails(updated);
                      }}
                      className="font-semibold text-sm text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-1/2 text-right cursor-text font-mono md:font-sans"
                    />
                  </div>
                  <button onClick={() => setVillaDetails(villaDetails.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors opacity-100 flex-shrink-0"><X size={16} /></button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={newDetailLabel} onChange={(e) => setNewDetailLabel(e.target.value)} placeholder="Tên nhãn" className="flex-1 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-lg p-2.5 text-sm font-medium w-2/3" />
                <input type="text" value={newDetailValue} onChange={(e) => setNewDetailValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddDetail()} placeholder="SL" className="w-1/3 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border-none rounded-lg p-2.5 text-sm font-medium text-center" />
              </div>
              <button onClick={handleAddDetail} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-400 py-2.5 rounded-lg font-semibold text-sm transition-all">+ Thêm thông tin</button>
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
            src={getOptimizedImageUrl(zoomedImage, 1600)}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in duration-300"
            alt="Zoomed"
          />
        </div>
      )}
    </div>

  );
};

export default VillaEditPage;
