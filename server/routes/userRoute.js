import express from 'express';
import { isAuth, logout, sendOtp, verifyOtp, getAllUsers, updateProfile } from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import { loginRateLimiter } from '../middlewares/loginRateLimiter.js';

const userRouter = express.Router();

userRouter.post('/send-otp', loginRateLimiter, sendOtp)
userRouter.post('/verify-otp', loginRateLimiter, verifyOtp)
userRouter.get('/is-auth', authUser, isAuth)
userRouter.get('/logout', authUser, logout)
userRouter.get('/all', getAllUsers)
userRouter.post('/update-profile', authUser, updateProfile)

export default userRouter