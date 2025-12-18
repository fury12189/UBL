import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import playerRoutes from './routes/players';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ubl_db';

// Middleware
app.use(cors() as any);
app.use(express.json() as any);

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// API Routes
app.use('/api', playerRoutes);

// --- Serve Static Frontend (Production) ---
// In CommonJS (configured in tsconfig.json), __dirname is globally available.
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath) as any);

// Catch-all handler: For any request that doesn't match an API route,
// send back the React index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});