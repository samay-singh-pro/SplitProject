import express from "express";
import cors from "cors";
import { connection } from "./database/connection.js";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import errorHandler from "./middlewares/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoute from "./routes/expenseRoutes.js";

const app = express();

config({ path: "./config/config.env" });


app.use(
  cors({
    origin: "*",
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  })
);



app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/user", authRoutes);
app.use("/api/v1/group", groupRoutes);
app.use("/api/v1/expense", expenseRoute);

connection();
app.use(errorHandler);
export default app;
