import express, { Router } from 'express';
import { createAvatar, deleteAvatar } from '../controllers/imgController';
import { authenticate } from '../controllers/authController';

const imgRouter: Router = express.Router();

imgRouter.route("/")
  .post(authenticate, createAvatar)
  .delete(authenticate, deleteAvatar);


export default imgRouter;