import express, { Router } from 'express';
import { createUser, deleteUser, getUser, getUsers } from '../controllers/userController';
import { execute } from '../utils/connectDB';

export const userRouter: Router = express.Router();

userRouter
  .route('/')
  .post(execute(createUser))
  .get(execute(getUsers))

userRouter
  .route('/:idx')
  .get(execute(getUser))
  .delete(execute(deleteUser))

