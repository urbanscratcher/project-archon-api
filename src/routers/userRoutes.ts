import express, { Router } from 'express';
import { createUser, deleteUser, getUser, getUsers } from '../controllers/userController';
import { connectDB } from '../utils/connectDB';


export const userRouter: Router = express.Router();

userRouter
  .route('/')
  .post((req, res, next) => connectDB(req, res, next, createUser))
  .get((req, res, next) => connectDB(req, res, next, getUsers))

userRouter
  .route('/:idx')
  .get((req, res, next) => connectDB(req, res, next, getUser))
  .delete((req, res, next) => connectDB(req, res, next, deleteUser))