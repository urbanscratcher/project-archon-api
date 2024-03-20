import { Router } from "express";
import { getRandomInsights } from "../controllers/randomController";

const randomRouter: Router = Router();

randomRouter
  .route('/insights')
  .get(getRandomInsights)

export default randomRouter;