import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from "express";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import pino from 'pino';
import globalErrorHandler from './controllers/errorController';
import { NotFoundError } from "./dtos/Errors";
import { authRouter } from './routers/authRoutes';
import { coverRouter } from './routers/coverRoutes';
import { insightRouter } from './routers/insightRoutes';
import { topicRouter } from './routers/topicRoutes';
import { userRouter } from './routers/userRoutes';
import { PORT } from './utils/constants';
const { xss } = require('express-xss-sanitizer')

// ENV SETTING ------------------------------------------
const httpLogger = require('pino-http')();
const logger = pino({ level: 'debug' });
dotenv.config({ path: '.env' })

// Uncaught Exception Handling (Synchronous) ------------
process.on('uncaughtException', (err: Error) => {
  logger.error(err, 'uncaught exception errors occurred');
  logger.error({}, 'Shutting down...');
  process.exit(1);
})

// EXPRESS -----------------------------------------------
const app = express();

// GLOBAL MIDDLEWARES ------------------------------------
// Set security HTTP headers
app.use(helmet());

// Limit 100 reqs / 1h
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many reqs from this IP, please try again in an hour'
});
app.use('/archon-api', limiter);

// Body parser reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Form pareser w/ qs module
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize data against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Cookie parser
app.use(cookieParser())

// MIDDLEWARES -------------------------------------------
// Logging all http requests
app.all('*', (req, res, next) => {
  httpLogger(req, res);
  next();
});

// Routing
app.use('/archon-api/v1/topics', topicRouter)
app.use('/archon-api/v1/users', userRouter)
app.use('/archon-api/v1/insights', insightRouter)
app.use('/archon-api/v1/covers', coverRouter)
app.use('/archon-api/v1/auth', authRouter)

// Other Routes Handling
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can not find on this server`))
});

// Error Handling
app.use(globalErrorHandler)

// SERVER RUN --------------------------------------------
const server = app.listen(PORT, () => {
  logger.info({}, `App running on port... ${PORT}`)
});

// Unexpected Rejection Handling (Asynchronous) ----------
process.on('unhandledRejection', (err: Error) => {
  logger.error(err, 'unhandled rejection errors occurred');
  logger.error({}, 'Shutting down...');
  server.close(() => {
    process.exit(1);
  })
})

