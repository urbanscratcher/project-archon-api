import express, { Router } from 'express';
import { createTopic, getAllTopics, removeTopic, updateTopics, updateTopic } from '../controllers/topicController';
import { connectDB } from '../utils/connectDB';


export const topicRouter: Router = express.Router();

topicRouter
  .route('/')
  .post((req, res, next) => connectDB(req, res, next, createTopic))
  .get((req, res, next) => connectDB(req, res, next, getAllTopics))
  .put((req, res, next) => connectDB(req, res, next, updateTopics))

topicRouter
  .route('/:idx')
  .delete((req, res, next) => connectDB(req, res, next, removeTopic))
  .patch((req, res, next) => connectDB(req, res, next, updateTopic))

