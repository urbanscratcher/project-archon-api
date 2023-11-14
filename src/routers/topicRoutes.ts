import express, { Router } from 'express';
import { authenticate, authorize } from '../controllers/authController';
import { createTopic, getAllTopics, removeTopic, updateTopic, updateTopics } from '../controllers/topicController';
import { ROLE } from '../utils/constants';

export const topicRouter: Router = express.Router();

topicRouter
  .route('/')
  .post(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    createTopic)
  .get(getAllTopics)
  .put(authenticate, updateTopics)

topicRouter
  .route('/:idx')
  .delete(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    removeTopic)
  .patch(
    authenticate,
    authorize(ROLE.ADMIN, ROLE.EDITOR),
    updateTopic)


