import { Router } from 'express';
import { authenticate, authorize } from '../controllers/authController';
import { createInsight, deleteInsight, getInsight, getInsights, updateInsight } from '../controllers/insightController';
import { addInsightHits, getInsightHits } from '../controllers/insightHitsController';
import { ROLE } from '../utils/constants';

const insightRouter: Router = Router();

insightRouter
  .route('/')
  .post(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.WRITER),
    createInsight)
  .get(getInsights);

insightRouter
  .route('/:idx')
  .get(getInsight)
  .patch(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.WRITER),
    updateInsight)
  .delete(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.WRITER),
    deleteInsight);

insightRouter
  .route('/:idx/hits')
  .post(addInsightHits)
  .get(getInsightHits)


export default insightRouter;