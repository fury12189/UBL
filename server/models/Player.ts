import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  playerImageUrl: string;
  email?: string;
  mobile: string;
  dob: Date;
  age: number;
  adhar?: string;
  category: '20-30' | '35+' | '40+' | '45+' | '50+' | '55+';
  upiOrBarcode?: string;
  paymentScreenshotUrl?: string;
  paymentStatus: boolean;
  achievements?: string;
  playingStyle?: 'OFFENSIVE' | 'DEFENSIVE' | 'UNKNOWN';
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  playerImageUrl: { type: String, required: true },
  email: { type: String, trim: true, lowercase: true },
  mobile: { type: String, required: true, index: true },
  dob: { type: Date, required: true },
  age: { type: Number, required: true, index: true },
  adhar: { type: String, index: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['20-30', '35+', '40+', '45+', '50+', '55+'] 
  },
  upiOrBarcode: { type: String },
  paymentScreenshotUrl: { type: String },
  paymentStatus: { type: Boolean, default: false, index: true },
  achievements: { type: String, maxlength: 1000 },
  playingStyle: { 
    type: String, 
    enum: ['OFFENSIVE', 'DEFENSIVE', 'UNKNOWN'], 
    default: 'UNKNOWN' 
  },
  remark: { type: String }
}, {
  timestamps: true
});

// Create text index for search
PlayerSchema.index({ name: 'text', email: 'text', mobile: 'text', adhar: 'text' });

export default mongoose.model<IPlayer>('Player', PlayerSchema);