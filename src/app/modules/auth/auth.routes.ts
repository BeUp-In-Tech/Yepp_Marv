import { Router } from 'express';
import passport from 'passport';
import { authController } from './auth.controller';
import { checkAuth } from '../../middlewares/auth.middleware';
import { Role } from '../user/user.interface';

const router = Router();

// CREDENTIAL LOGIN
router.post('/login', authController.credentialsLogin);
// CHANGE PASSWORD
router.post('/change_password', checkAuth(...Object.keys(Role)), authController.changePassword);
// FORGET PASSWORD
router.get('/forget_password/:email', authController.forgetPassword);
// VERIFY FORGET PASSWORD OTP
router.post('/verify_otp', authController.verifyForgetPasswordOTP);
// RESET PASSWORD
router.post('/reset_password', authController.resetPassword);
// GET NEW TOKEN
router.post('/generate_token', authController.getNewAccessToken);

// GOOGLE LOGIN
router.get('/google', authController.googleRegister);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  authController.googleCallback
);

// APPLE LOGIN
router.post('/apple_login', authController.appleLogin);




export const authRouter = router;
