import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt";
import { SignupInput } from "../validations/auth";

const prisma = new PrismaClient();

export async function signupService(data: SignupInput) {
  //checking if user exists first
  const existing = await prisma.user.findUinque({
    where: {
      email: data.email,
    },
  });
  if (existing) {
    throw new Error("Email already in use");
  }
  //now hashing the password for encryption
  const hashedPass = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      password: hashedPass,
    },
  });
  const token = generateToken(user.id);
  return { user, token };
}

export async function loginService(email: string, password: string) {
  //checking if user exists
  const user = await prisma.user.findUinque({
    where: {
      email: email,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }
  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new Error("invalid credentials");
  }
  const token = generateToken(user.id);
  return { user, token };
}
