import express, { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Player, { IPlayer } from '../models/Player';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// --- Configuration ---

// Cloudinary Config (or fallback to memory for demo purposes if keys missing)
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Multer Storage
const storage = useCloudinary 
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => ({
        folder: 'ubl_players',
        format: file.mimetype.split('/')[1], // jpeg, png
        public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
      }),
    })
  : multer.memoryStorage(); // Fallback for dev without Cloudinary credentials

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware: Admin Auth
const requireAdmin = (req: any, res: any, next: express.NextFunction) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing admin token.' });
  }
  next();
};

// Rate Limiter for Submissions
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: 'Too many registrations from this IP, please try again later.'
});

// --- Routes ---

/**
 * @route POST /api/uploads
 * @desc Upload image to Cloudinary (or mock) and return URL
 */
router.post('/uploads', upload.single('file') as any, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // If using Cloudinary storage, path is in req.file.path
    if (useCloudinary) {
      return res.json({ url: (req.file as any).path });
    } else {
      // Mock response for local dev without Cloudinary
      // In a real local-fs scenario, you'd serve this statically
      return res.json({ url: `https://picsum.photos/seed/${Date.now()}/400/400` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * @route POST /api/players
 * @desc Step 1: Create a new player submission (Basic Info)
 */
router.post('/players', createLimiter as any, async (req: any, res: any) => {
  try {
    const player = new Player(req.body);
    const savedPlayer = await player.save();
    res.status(201).json(savedPlayer);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to create registration' });
  }
});

/**
 * @route PATCH /api/players/:id/details
 * @desc Step 2: Update player with payment and stats details (Public)
 */
router.patch('/players/:id/details', async (req: any, res: any) => {
  try {
    const { upiOrBarcode, paymentScreenshotUrl, paymentStatus, achievements, playingStyle, remark } = req.body;
    
    // Whitelist fields to update
    const updates = {
      upiOrBarcode,
      paymentScreenshotUrl,
      paymentStatus,
      achievements,
      playingStyle,
      remark
    };

    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, updates, { new: true });
    
    if (!updatedPlayer) {
        return res.status(404).json({ error: 'Player record not found.' });
    }

    res.json(updatedPlayer);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update registration details.' });
  }
});

/**
 * @route GET /api/players
 * @desc Get all players with filters, pagination, sort (Admin only)
 */
router.get('/players', requireAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { search, category, paymentStatus, ageMin, ageMax, style, sort } = req.query;

    let query: any = {};

    // Filters
    if (search) {
      query.$text = { $search: search as string };
    }
    if (category) query.category = category;
    if (paymentStatus) query.paymentStatus = paymentStatus === 'true';
    if (style) query.playingStyle = style;
    
    if (ageMin || ageMax) {
      query.age = {};
      if (ageMin) query.age.$gte = parseInt(ageMin as string);
      if (ageMax) query.age.$lte = parseInt(ageMax as string);
    }

    // Sort
    let sortOption: any = { createdAt: -1 }; // Default
    if (sort) {
      const [field, order] = (sort as string).split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const [results, total] = await Promise.all([
      Player.find(query).sort(sortOption).skip(skip).limit(limit),
      Player.countDocuments(query)
    ]);

    const stats = await Player.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);

    const paidCount = stats.find(s => s._id === true)?.count || 0;
    const unpaidCount = stats.find(s => s._id === false)?.count || 0;

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
      stats: { total: paidCount + unpaidCount, paid: paidCount, unpaid: unpaidCount }
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error fetching data' });
  }
});

/**
 * @route GET /api/players/:id
 * @desc Get single player
 */
router.get('/players/:id', requireAdmin, async (req: any, res: any) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route PUT /api/players/:id
 * @desc Update player (e.g., mark payment)
 */
router.put('/players/:id', requireAdmin, async (req: any, res: any) => {
  try {
    const updated = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * @route DELETE /api/players/:id
 * @desc Delete player
 */
router.delete('/players/:id', requireAdmin, async (req: any, res: any) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;