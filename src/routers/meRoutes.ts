import express, { Router } from "express";
import { authenticate, authorize } from "../controllers/authController";
import { getMe } from "../controllers/meController";
import { ROLE } from "../utils/constants";

const meRouter: Router = express.Router();

meRouter.route('/')
  .get(
    authenticate, getMe);

export default meRouter;
