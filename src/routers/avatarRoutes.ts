import express, { Router } from 'express';
import { uploadAvatar, removeAvatar } from '../controllers/imgController';
import { authenticate } from '../controllers/authController';

const avatarRouter: Router = express.Router();

avatarRouter.route("/")
  .post(authenticate, uploadAvatar)
  .delete(authenticate, removeAvatar);


export default avatarRouter;