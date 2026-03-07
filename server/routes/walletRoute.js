import express from 'express';
import {
    getBalance,
    getTransactions,
    addCoins,
    deductCoins,
    getAllWallets,
    rechargeWallet,
    verifyWalletPayment
} from '../controllers/walletController.js';
import authUser from '../middlewares/authUser.js';

const walletRouter = express.Router();

walletRouter.get('/balance', authUser, getBalance);
walletRouter.get('/transactions', authUser, getTransactions);
walletRouter.post('/add', addCoins);
walletRouter.post('/deduct', deductCoins);
walletRouter.get('/all', getAllWallets);
walletRouter.post('/recharge', authUser, rechargeWallet);
walletRouter.post('/verify', authUser, verifyWalletPayment);
export default walletRouter;
