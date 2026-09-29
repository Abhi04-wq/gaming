const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const initLudoSocket = require('./socket/ludoSocket');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  const User = require('./models/User');
  User.updateMany({ usdtBalance: '50.00' }, { $set: { usdtBalance: '0.00' } })
    .then((res) => {
      if (res.modifiedCount > 0) {
        console.log(`[Database Cleanup] Reset ${res.modifiedCount} legacy 50.00 balance accounts to 0.00`);
      }
    })
    .catch((err) => console.error('[Cleanup Error]', err));
}).catch(() => {});

const app = express();

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Web3 Wallet Authentication System',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/games', require('./routes/games'));
app.use('/api/game-config', require('./routes/gameConfig'));

// Serve Frontend static assets from client/dist (with UTF-8 and SPA fallback)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
      },
    })
  );

  // Handle SPA client-side routing fallback: any GET request returns index.html
  app.get('*', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
initLudoSocket(io);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Web3 Auth Server Running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
