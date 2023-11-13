import express, { Router } from 'express';
import { verifyEmail, signIn } from '../controllers/authController';
import { asyncHandledDB } from '../utils/connectDB';

export const authRouter: Router = express.Router();

authRouter
  .route('/')
  .post(asyncHandledDB(signIn))

authRouter
  .route('/email')
  .post(asyncHandledDB(verifyEmail))
