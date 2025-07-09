
import cors from 'cors';

const corsOptions = {
  origin: [
    'http://localhost:3000', // Next.js development
    'http://localhost:3001', // Backend
    'https://your-frontend-domain.com', // Production frontend
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
};

export const corsMiddleware = cors(corsOptions);