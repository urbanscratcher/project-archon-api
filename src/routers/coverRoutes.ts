import express, { Router } from 'express';
import { createCover, getAllCovers, removeCover, updateCover } from '../controllers/coverController';
import { asyncHandledDB } from '../utils/connectDB';

export const coverRouter: Router = express.Router();

coverRouter
  .route('/')
  .post(asyncHandledDB(createCover))
  .get(asyncHandledDB(getAllCovers))

coverRouter
  .route('/:idx')
  .patch(asyncHandledDB(updateCover))
  .delete(asyncHandledDB(removeCover))

