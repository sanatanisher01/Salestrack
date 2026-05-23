require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const https = require('https');

const { initFirebase } = require('./config/firebase');
const { initWebPush } = require('./utils/webpush');
const { startStopEventDetector } = require('./jobs/stopEventDetector');

initFirebase();
initWebPush();

const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api/salesman', require('./routes/salesman'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/location', require('./routes/location'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startStopEventDetector();

  // Self-ping every 14 minutes to prevent Render free tier sleep
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(() => {
    https.get(`${SELF_URL}/health`, (res) => {
      console.log(`Self-ping: ${res.statusCode}`);
    }).on('error', () => {});
  }, 14 * 60 * 1000);
});
