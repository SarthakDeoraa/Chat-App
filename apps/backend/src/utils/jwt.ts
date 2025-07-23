import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
