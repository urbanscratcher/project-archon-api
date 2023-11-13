import express, { Router } from 'express';
import { createTopic, getAllTopics, removeTopic, updateTopic, updateTopics } from '../controllers/topicController';
import { execute } from '../utils/connectDB';

export const topicRouter: Router = express.Router();

topicRouter
  .route('/')
  .post(execute(createTopic))
  .get(execute(getAllTopics))
  .put(execute(updateTopics))

topicRouter
  .route('/:idx')
  .delete(execute(removeTopic))
  .patch(execute(updateTopic))

