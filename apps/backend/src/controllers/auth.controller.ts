import { signupService, loginService } from "../services/auth.service";
import { Request, Response } from "express";

export async function signup(req: Request, res: Response) {
  try {
    const { name, email, username, password } = req.body;
    const result = await signupService({ name, email, username, password });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
