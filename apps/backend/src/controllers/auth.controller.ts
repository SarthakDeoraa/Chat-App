import { signupService, loginService } from "../services/auth.service";
import { Request, Response } from "express";
import { signupSchema, loginSchema } from "../validations/auth";
import { z } from "zod";

export async function signup(req: Request, res: Response) {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: z.treeifyError(result.error) });
  }

  try {
    const data = result.data;
    const userData = await signupService(data);
    res.status(201).json(userData);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: z.treeifyError(result.error) });
  }

  try {
    const { email, password } = result.data;
    const userData = await loginService(email, password);
    res.status(200).json(userData);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
