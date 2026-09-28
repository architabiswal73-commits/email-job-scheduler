import IORedis from 'ioredis';
import { config } from '../config/env';

export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null
});
