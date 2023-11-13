import dotenv from 'dotenv';
import express from "express";
import pino from 'pino';
import { NotFoundError } from "./classes/Errors";
import globalErrorHandler from './controllers/errorController';
import { coverRouter } from './routers/coverRoutes';
import { insightRouter } from './routers/insightRoutes';
import { topicRouter } from './routers/topicRoutes';
import { userRouter } from './routers/userRoutes';
import { authRouter } from './routers/authRoutes';
const httpLogger = require('pino-http')();
const logger = pino({ level: 'debug' });
dotenv.config({ path: '.env' })

// Uncaught Exception Handling (Synchronous)
process.on('uncaughtException', (err: Error) => {
  logger.error(err, 'uncaught exception errors occurred');
  logger.error({}, 'Shutting down...');
  process.exit(1);
})



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
const PORT = 5003;
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

