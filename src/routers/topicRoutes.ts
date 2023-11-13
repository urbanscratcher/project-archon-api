import express, { Router } from 'express';
import { createTopic, getAllTopics, removeTopic, updateTopic, updateTopics } from '../controllers/topicController';
import { asyncHandledDB } from '../utils/connectDB';

export const topicRouter: Router = express.Router();

topicRouter
  .route('/')
  .post(asyncHandledDB(createTopic))
  .get(asyncHandledDB(getAllTopics))
  .put(asyncHandledDB(updateTopics))

topicRouter
  .route('/:idx')
  .delete(asyncHandledDB(removeTopic))
  .patch(asyncHandledDB(updateTopic))

