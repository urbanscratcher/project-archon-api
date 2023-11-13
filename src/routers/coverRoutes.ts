import express, { Router } from 'express';
import { createCover, getAllCovers, removeCover, updateCover } from '../controllers/coverController';
import { execute } from '../utils/connectDB';


export const coverRouter: Router = express.Router();

coverRouter
  .route('/')
  .post(execute(createCover))
  .get(execute(getAllCovers))

coverRouter
  .route('/:idx')
  .patch(execute(updateCover))
  .delete(execute(removeCover))

