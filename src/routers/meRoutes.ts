import express, { Router } from "express";
import { authenticate } from "../controllers/authController";
import { getMe } from "../controllers/meController";

const meRouter: Router = express.Router();

meRouter.route('/')
  .get(
    authenticate, getMe);

export default meRouter;
