import { asyncHandled } from './../utils/connectDB';
import express, { Router } from 'express';
import { createInsight, deleteInsight, getInsight, getInsights, updateInsight } from '../controllers/insightController';
import { asyncHandledDB } from '../utils/connectDB';
import { protect } from '../controllers/authController';

export const insightRouter: Router = express.Router();

insightRouter
  .route('/')
  .post(asyncHandledDB(protect), asyncHandledDB(createInsight))
  .get(asyncHandledDB(protect), asyncHandledDB(getInsights))

insightRouter
  .route('/:idx')
  .get(asyncHandledDB(getInsight))
  .patch(asyncHandledDB(updateInsight))
  .delete(asyncHandledDB(deleteInsight))