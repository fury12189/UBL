export interface Player {
    _id?: string;
    name: string;
    playerImageUrl: string;
    email?: string;
    mobile: string;
    dob: string;
    age: number;
    adhar?: string;
    category: string;
    upiOrBarcode?: string;
    paymentScreenshotUrl?: string;
    paymentStatus: boolean;
    achievements?: string;
    playingStyle?: 'OFFENSIVE' | 'DEFENSIVE' | 'UNKNOWN';
    remark?: string;
    createdAt?: string;
}

export const CATEGORIES = ['20-30', '35+', '40+', '45+', '50+', '55+'];
