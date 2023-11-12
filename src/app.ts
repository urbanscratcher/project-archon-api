import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from "express";
import pino from 'pino';
import { DuplicationError, NotFoundError } from "./classes/Errors";
import globalErrorHandler from './controllers/errorController';
import { topicRouter } from './routers/topicRoutes';
import { userRouter } from './routers/userRoutes';
const httpLogger = require('pino-http')();
const logger = pino({ level: 'debug' });
dotenv.config({ path: '.env' })

// SETTING -----------------------------------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MIDDLEWARES -------------------------------------------
// Logging all http requests
app.all('*', (req, res, next) => {
  httpLogger(req, res);
  next();
});

// Routing
app.use('/archon-api/v1/topics', topicRouter)
app.use('/archon-api/v1/users', userRouter)

// Other Routes Handling
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can not find on this server`))
});

// Error Handling
app.use(globalErrorHandler)


// SERVER RUN --------------------------------------------
const PORT = 5003;
app.listen(PORT, () => {
  console.log("app running on port...", PORT);
});
