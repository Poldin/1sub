import { z } from 'zod';

export const registerToolSchema = z.object({
  name: z.string().min(2).max(100),
  url: z.string().url(),
});

export const mintTokenSchema = z.object({
  sub: z.string(),
  email: z.string().email().optional(),
  scope: z.array(z.string()).optional(),
});


