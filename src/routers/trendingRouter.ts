import { Router } from 'express';
import { getTrendingInsights } from '../controllers/trendingController';

const trendingRouter: Router = Router();

trendingRouter
  .route('/insights')
  .get(getTrendingInsights)

export default trendingRouter;