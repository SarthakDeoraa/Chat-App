import express from "express";
import authRoutes from "./routes/auth.routes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
import userRoutes from "./routes/user.routes";
app.use("/api/users", userRoutes);
import messageRoutes from "./routes/message.routes";
app.use("/api/messages", messageRoutes);
import groupRoutes from "./routes/group.routes";
app.use("/api/groups", groupRoutes);

export default app;
