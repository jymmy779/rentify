import { createClient } from '@supabase/supabase-js';

// Cấu hình môi trường Redis
const redisUrl = process.env.REDIS_URL || '';
const redisToken = process.env.REDIS_TOKEN || '';

let redisClient: any = null;

// Khởi tạo Redis Client nếu có thông tin kết nối (Sử dụng Upstash Redis REST API rất phù hợp cho Serverless Next.js)
if (redisUrl && redisToken) {
  try {
    // Upstash Redis SDK sử dụng HTTP REST, hoạt động mượt mà ở cả Edge Runtime và Serverless
    // Bạn có thể cài đặt bằng lệnh: npm install @upstash/redis
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('[Redis] ⚡ Khởi tạo thành công kết nối Upstash Redis.');
  } catch (e) {
    console.warn('[Redis] ⚠️ Không thể khởi tạo Upstash Redis SDK. Hãy chắc chắn đã chạy `npm install @upstash/redis`.');
  }
}

/**
 * Hàm hỗ trợ lấy dữ liệu từ Cache (Redis), nếu không có sẽ tự động gọi DB (Supabase) và lưu lại vào Cache.
 * Thiết kế thông minh: Nếu chưa cấu hình Redis, hệ thống sẽ tự động bỏ qua (bypass) và gọi trực tiếp Supabase mà không gây lỗi.
 * 
 * @param key Khóa định danh cache (ví dụ: 'villas:all')
 * @param dbFetchFunction Hàm bất đồng bộ để lấy dữ liệu từ Supabase nếu cache bị miss
 * @param ttlSeconds Thời gian sống của cache (Time-to-live) tính bằng giây. Mặc định là 300s (5 phút)
 */
export async function getWithCache<T>(
  key: string,
  dbFetchFunction: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // 1. Nếu Redis đã được cấu hình thành công
  if (redisClient) {
    try {
      console.log(`[Redis] 🔍 Đang kiểm tra Cache cho key: ${key}`);
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log(`[Redis] 🎉 Cache HIT cho key: ${key}`);
        // Upstash tự động parse JSON hoặc trả về chuỗi tùy phiên bản, ta kiểm tra kỹ
        return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      }
      
      console.log(`[Redis] 💨 Cache MISS cho key: ${key}. Đang lấy dữ liệu từ database...`);
    } catch (error) {
      console.error(`[Redis] ❌ Lỗi đọc cache cho key: ${key}:`, error);
    }
  }

  // 2. Lấy dữ liệu thực từ Database (Supabase)
  const freshData = await dbFetchFunction();

  // 3. Lưu lại vào Redis Cache cho các lần gọi sau
  if (redisClient && freshData) {
    try {
      console.log(`[Redis] 💾 Đang ghi cache cho key: ${key} (TTL: ${ttlSeconds}s)`);
      await redisClient.set(key, JSON.stringify(freshData), { ex: ttlSeconds });
    } catch (error) {
      console.error(`[Redis] ❌ Lỗi ghi cache cho key: ${key}:`, error);
    }
  }

  return freshData;
}

/**
 * Hàm xóa cache khi dữ liệu thay đổi (ví dụ khi cập nhật giá villa, cập nhật thông tin villa)
 * @param key Khóa cache cần xóa
 */
export async function invalidateCache(key: string): Promise<void> {
  if (redisClient) {
    try {
      console.log(`[Redis] 🗑️ Đang xóa cache cho key: ${key}`);
      await redisClient.del(key);
    } catch (error) {
      console.error(`[Redis] ❌ Lỗi xóa cache cho key: ${key}:`, error);
    }
  }
}
