import express, { Router } from 'express';
import { authenticate } from '../controllers/authController';
import { uploadAvatar, uploadInisghtImg, uploadThumbnail, removeAvatar } from '../controllers/imgController';

const imgsRouter: Router = express.Router();


imgsRouter.route("/avatars")
  .post(authenticate, uploadAvatar)
  .delete(authenticate, removeAvatar);

imgsRouter.route("/insights")
  .post(authenticate, uploadInisghtImg);

imgsRouter.route("/thumbnails")
  .post(authenticate, uploadThumbnail);


export default imgsRouter;