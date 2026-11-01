import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', err => {
  console.error('❌ Redis Client Error:', err);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  }
};

// Shortcut helpers
export const setCache = async (
  key: string,
  value: any,
  expireSec: number = 60,
) => {
  await redisClient.setEx(key, expireSec, JSON.stringify(value));
};

export const getCache = async (key: string) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const delCache = async (key: string) => {
  await redisClient.del(key);
};

export const incrKey = async (key: string) => {
  return await redisClient.incr(key);
};

export const expireKey = async (key: string, ttl: number) => {
  await redisClient.expire(key, ttl);
};

export default redisClient;
