import express, { Router } from 'express';
import { authenticate, authorize } from '../controllers/authController';
import { createCover, getAllCovers, getHeadline, removeCover, updateCover } from '../controllers/coverController';
import { ROLE } from '../utils/constants';

const coverRouter: Router = express.Router();

coverRouter
  .route('/headline')
  .get(getHeadline);

coverRouter
  .route('/')
  .post(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    createCover)
  .get(getAllCovers)

coverRouter
  .route('/:idx')
  .patch(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    updateCover)
  .delete(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    removeCover)

export default coverRouter;