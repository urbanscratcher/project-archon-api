import express, { Router } from 'express';
import { createCategory, getAllCategories, removeCategory, updateCategories, updateCategory } from '../controllers/categoryController';
import { connectDB } from '../utils/connectDB';


export const categoryRouter: Router = express.Router();

categoryRouter
  .route('/')
  .post((req, res, next) => connectDB(req, res, next, createCategory))
  .get((req, res, next) => connectDB(req, res, next, getAllCategories))
  .put((req, res, next) => connectDB(req, res, next, updateCategories))

categoryRouter
  .route('/:idx')
  .delete((req, res, next) => connectDB(req, res, next, removeCategory))
  .patch((req, res, next) => connectDB(req, res, next, updateCategory))

