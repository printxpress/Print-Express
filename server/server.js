import './polyfill.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import serviceRouter from './routes/serviceRoute.js';
import pricingRouter from './routes/pricingRoute.js';
import deliveryRouter from './routes/deliveryZoneRoute.js';
import walletRouter from './routes/walletRoute.js';
import couponRouter from './routes/couponRoute.js';
import queryRouter from './routes/queryRoute.js';
import shopRouter from './routes/shopRoute.js';
import billingRouter from './routes/billingRoute.js';
import systemRouter from './routes/systemRoute.js';
import bannerRouter from './routes/bannerRoute.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

await connectDB()
await connectCloudinary()

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://printexpress.up.railway.app',
    'https://printexpress.in',
    'https://www.printexpress.in'
].filter(Boolean);


app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Middleware configuration
app.use(express.json());
app.use(cookieParser());
// API Routes
app.use('/api/user', userRouter)
app.use('/api/seller', sellerRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/address', addressRouter)
app.use('/api/order', orderRouter)
app.use('/api/services', serviceRouter)
app.use('/api/pricing', pricingRouter)
app.use('/api/delivery', deliveryRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/coupon', couponRouter)
app.use('/api/support', queryRouter)
app.use('/api/shop', shopRouter)
app.use('/api/billing', billingRouter)
app.use('/api/system', systemRouter)
app.use('/api/banner', bannerRouter)

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const clientBuildPath = path.join(__dirname, '../client/dist');
    app.use(express.static(clientBuildPath));

    // Handle React routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send("API is Working"));
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(port, '0.0.0.0', () => {
        console.log('\n╔══════════════════════════════════════╗');
        console.log('║  🖨️  Print Express Server Running    ║');
        console.log(`║  🌐 http://localhost:${port}            ║`);
        console.log('║  📡 API Ready                        ║');
        console.log('╚══════════════════════════════════════╝\n');
    });
}

export default app;
