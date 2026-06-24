import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Lỗi: Chưa cấu hình DATABASE_URL trong file .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const connect = async () => {
  try {
    await prisma.$connect();
    console.log('Kết nối Database thành công!');
  } catch (error) {
    console.error('Lỗi kết nối Database:', error);
    process.exit(1);
  }
};
