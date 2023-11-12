import express, { Router } from 'express';
import { createCategory } from '../controllers/categoryController';
import { connectDB } from '../utils/connectDB';


export const categoryRouter: Router = express.Router();

categoryRouter
  .route('/')
  .post((req, res, next) => connectDB(req, res, next, createCategory))
