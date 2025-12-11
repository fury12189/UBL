# United Badminton League (UBL) Portal

A MERN stack application for player registration and league management.

## Features
- **Public Registration:** Neon-themed, responsive form with file uploads (Player Image, Payment Screenshot).
- **Admin Dashboard:** Secure view with filtering, sorting, pagination, and bulk actions.
- **Backend:** Node/Express/TypeScript with MongoDB.
- **Storage:** Cloudinary integration for images.

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account (Optional, falls back to mock if not provided for testing)

### Environment Variables (.env)
Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ubl_db
# Security
ADMIN_TOKEN=secret_admin_token_123
JWT_SECRET=super_secret_jwt_key
# Cloudinary (Required for real image hosting)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the App
This project is set up to run client and server concurrently.

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

2. Run development server:
   ```bash
   npm run dev
   ```
   
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

### Admin Access
Navigate to `/admin`. You will be prompted for a token. Enter the value set in `ADMIN_TOKEN` (default: `secret_admin_token_123`).

## API Endpoints (Sample)

**GET /api/players**
```bash
curl -H "x-admin-token: secret_admin_token_123" "http://localhost:5000/api/players?page=1&limit=10"
```

**POST /api/players**
```json
{
  "name": "Vishal Verma",
  "mobile": "9876543210",
  "dob": "1990-01-01",
  "age": 34,
  "category": "35+",
  "playerImageUrl": "https://...",
  "paymentStatus": false
}
```
