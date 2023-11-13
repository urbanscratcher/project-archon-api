import express, { Router } from 'express';
import { signIn, verifyEmail } from '../controllers/authController';

export const authRouter: Router = express.Router();

authRouter
  .route('/')
  .post(signIn)

authRouter
  .route('/email')
  .post(verifyEmail)
