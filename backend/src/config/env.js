require('dotenv/config');
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  REFRESH_TOKEN_COOKIE_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_COOKIE_SECRET must be at least 32 characters'),
  GEMINI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.url({ error: 'FRONTEND_URL must be a valid URL' }),
  LOG_LEVEL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

module.exports = parsed.data;
