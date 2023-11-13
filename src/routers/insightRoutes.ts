import express, { Router } from 'express';
import { createInsight, deleteInsight, getInsight, getInsights, updateInsight } from '../controllers/insightController';
import { execute } from '../utils/connectDB';

export const insightRouter: Router = express.Router();

insightRouter
  .route('/')
  .post(execute(createInsight))
  .get(execute(getInsights))

insightRouter
  .route('/:idx')
  .get(execute(getInsight))
  .patch(execute(updateInsight))
  .delete(execute(deleteInsight))