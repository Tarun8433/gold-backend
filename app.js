import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import session from 'express-session';
import flash from 'connect-flash';
import dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import ordersRoutes from './routes/orders.js';
import reviewsRoutes from './routes/reviews.js';
import addressesRoutes from './routes/addresses.js';
import notificationsRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payment.js';
import vouchersRoutes from './routes/vouchers.js';
import adminRoutes from './routes/admin.js';

// Replicate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

// Connect Database
connectDB();

const app = express();

// Enable CORS for all origins (configure as needed for production)
app.use(cors());

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/upload', uploadRoutes);
// Sanitize data
// Note: express-mongo-sanitize is currently disabled due to compatibility issues with Express 5.x
// app.use(mongoSanitize());

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    },
  })
);

// Connect Flash
app.use(flash());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Define Routes
app.get('/', (req, res) => res.send('API Running'));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

export default app;
