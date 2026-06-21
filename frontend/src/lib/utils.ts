/**
 * Tối ưu hóa hình ảnh thông qua dịch vụ weserv (wsrv.nl)
 * Giúp nén ảnh, chuyển sang định dạng WebP và resize theo yêu cầu.
 */
export const getOptimizedImageUrl = (url: string, width: number = 1200) => {
  if (!url) return '';
  
  // Nếu là ảnh blob tạm thời thì không qua weserv được
  if (url.startsWith('blob:')) return url;
  
  // Nếu là ảnh từ Unsplash hoặc các nguồn đã có tối ưu thì có thể bỏ qua hoặc vẫn dùng weserv để thống nhất
  // Ở đây mình dùng weserv cho tất cả các link thật để đảm bảo định dạng WebP và tốc độ load.
  
  // Xóa protocol để weserv xử lý tốt hơn (tùy chọn)
  const cleanUrl = url.replace(/^https?:\/\//, '');
  
  return `https://wsrv.nl/?url=${cleanUrl}&w=${width}&output=webp&q=85&il`;
};
