import express, { Router } from 'express';
import { createUser, deleteUser, getUser, getUsers, updateUser } from '../controllers/userController';
import { asyncHandledDB } from '../utils/connectDB';

export const userRouter: Router = express.Router();

userRouter
  .route('/')
  .post(asyncHandledDB(createUser))
  .get(asyncHandledDB(getUsers))

userRouter
  .route('/:idx')
  .get(asyncHandledDB(getUser))
  .patch(asyncHandledDB(updateUser))
  .delete(asyncHandledDB(deleteUser))

