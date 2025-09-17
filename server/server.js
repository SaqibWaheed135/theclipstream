import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";


import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import authRoutes from "./routes/auth.js";
import videoRoutes from './routes/videos.js'


const app = express();
const allowedOrigins = [
  "http://localhost:5173", // React dev server
  "http://localhost:5000", // API itself (optional)
  "https://theclipstream.com", // your production domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

  // serve uploaded files (dev)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Routes
app.use("/api/auth", authRoutes);
app.use('/api/videos', videoRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
