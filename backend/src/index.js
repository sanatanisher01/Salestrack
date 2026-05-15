require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { initFirebase } = require('./config/firebase');
const { initWebPush } = require('./utils/webpush');
const { startStopEventDetector } = require('./jobs/stopEventDetector');

initFirebase();
initWebPush();

const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, Postman) or matching origin
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(null, true); // allow all origins for now
  },
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
});
