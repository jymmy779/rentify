import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is not configured in .env file');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const connect = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};
