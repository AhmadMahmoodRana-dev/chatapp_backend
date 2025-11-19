import "dotenv/config.js";
import express from "express";
import http from "http";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDb from "./config/connectDb.js";
import mainFunction from "./routes/mainFunction.js";
import multer from "multer"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);

// Express middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
mainFunction(app);

// Health check
app.get("/", (req, res) => res.send("Chat backend OK"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 50MB allowed.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Connect to MongoDB
connectDb();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${path.join(__dirname, 'uploads')}`);
});