import { Router } from 'express';
import { getTrendingAuthors, getTrendingInsights } from '../controllers/trendingController';

const trendingRouter: Router = Router();

trendingRouter
  .route('/insights')
  .get(getTrendingInsights)

trendingRouter
  .route('/authors')
  .get(getTrendingAuthors)

export default trendingRouter;