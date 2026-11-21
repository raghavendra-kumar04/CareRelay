const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ error: 'name is required' })
    .trim()
    .min(1, 'name is required')
    .max(80, 'name must be at most 80 characters'),
  email: z
    .string({ error: 'email is required' })
    .trim()
    .toLowerCase()
    .email('email must be a valid email address'),
  password: z
    .string({ error: 'password is required' })
    .min(8, 'password must be at least 8 characters')
    .max(72, 'password must be at most 72 characters'),
});

const loginSchema = z.object({
  email: z
    .string({ error: 'email is required' })
    .trim()
    .toLowerCase()
    .email('email must be a valid email address'),
  password: z
    .string({ error: 'password is required' })
    .min(1, 'password is required'),
});

module.exports = { registerSchema, loginSchema };
