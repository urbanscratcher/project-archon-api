import express, { Router } from 'express';
import { verifyEmail, signIn } from '../controllers/authController';
import { execute } from '../utils/connectDB';

export const authRouter: Router = express.Router();

authRouter
  .route('/')
  .post(execute(signIn))

authRouter
  .route('/email')
  .post(execute(verifyEmail))
