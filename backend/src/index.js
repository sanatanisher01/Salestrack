require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const https = require('https');

const { initFirebase } = require('./config/firebase');
const { initWebPush } = require('./utils/webpush');
const { startStopEventDetector } = require('./jobs/stopEventDetector');

initFirebase();
initWebPush();

const app = express();

app.use(helmet());
app.set('trust proxy', 1);

// Restrict CORS to known frontend origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api/salesman', require('./routes/salesman'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/location', require('./routes/location'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/razorpay', require('./routes/razorpay'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message, err.stack);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startStopEventDetector();

  // Self-ping every 14 minutes to prevent Render free tier sleep
  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  if (SELF_URL) {
    setInterval(() => {
      const client = SELF_URL.startsWith('https') ? https : http;
      client.get(`${SELF_URL}/health`, (res) => {
        console.log(`Self-ping: ${res.statusCode}`);
      }).on('error', () => {});
    }, 14 * 60 * 1000);
  }
});
