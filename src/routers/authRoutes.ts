import express, { Router } from 'express';
import { refreshTokens, signIn, verifyEmail } from '../controllers/authController';

export const authRouter: Router = express.Router();

authRouter
  .route('/')
  .post(signIn)

authRouter
  .route('/email')
  .post(verifyEmail)

authRouter
  .route('/refresh')
  .post(refreshTokens)


