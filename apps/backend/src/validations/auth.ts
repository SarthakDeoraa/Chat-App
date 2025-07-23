import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.email(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

// Infer types if needed
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
