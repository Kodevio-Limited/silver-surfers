import { env } from './src/config/env.ts';
console.log('Current Redis URL:', env.redisUrl);
process.exit(0);
