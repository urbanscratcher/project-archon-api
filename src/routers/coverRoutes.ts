import express, { Router } from 'express';
import { authenticate, authorize } from '../controllers/authController';
import { createCover, getAllCovers, removeCover, updateCover } from '../controllers/coverController';
import { ROLE } from '../controllers/userController';

export const coverRouter: Router = express.Router();

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

