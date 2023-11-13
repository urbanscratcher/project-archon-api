import express, { Router } from 'express';
import { authenticate } from '../controllers/authController';
import { createUser, deleteUser, getUser, getUsers, updateUser } from '../controllers/userController';

export const userRouter: Router = express.Router();

userRouter
  .route('/')
  .post(createUser)
  .get(getUsers)

userRouter
  .route('/:idx')
  .get(getUser)
  .patch(authenticate, updateUser)
  .delete(authenticate, deleteUser)

