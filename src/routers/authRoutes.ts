import express, { Router } from 'express';
import { refreshTokens, signIn, verifyEmail } from '../controllers/authController';

const authRouter: Router = express.Router();

authRouter
  .route('/')
  .post(signIn)

authRouter
  .route('/email')
  .post(verifyEmail)

authRouter
  .route('/refresh')
  .post(refreshTokens)

export default authRouter;


