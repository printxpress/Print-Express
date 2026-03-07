import express from 'express';
import { isSellerAuth, sellerLogin, sellerLogout, getSellerAnalytics, getReferrals } from '../controllers/sellerController.js';
import authSeller from '../middlewares/authSeller.js';

const sellerRouter = express.Router();

sellerRouter.post('/login', sellerLogin);
sellerRouter.get('/is-auth', authSeller, isSellerAuth);
sellerRouter.get('/logout', sellerLogout);
sellerRouter.get('/analytics', authSeller, getSellerAnalytics);
sellerRouter.get('/referrals', authSeller, getReferrals);

export default sellerRouter;