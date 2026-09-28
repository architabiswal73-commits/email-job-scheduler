import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

export const db = new PrismaClient({
  datasources: {
    db: { url: config.databaseUrl }
  }
});
