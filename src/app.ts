import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import pino from "pino";
import globalErrorHandler from "./controllers/errorController";
import { NotFoundError } from "./dtos/Errors";
import authRouter from "./routers/authRoutes";
import coverRouter from "./routers/coverRoutes";
import insightRouter from "./routers/insightRoutes";
import meRouter from "./routers/meRoutes";
import topicRouter from "./routers/topicRoutes";
import userRouter from "./routers/userRoutes";
import {
  ORIGINS,
  PORT,
  RATE_LIMIT_AMOUNT,
  RATE_LIMIT_MIN,
} from "./utils/constants";
// @ts-ignore
import fileUpload from "express-fileupload";
import imgsRouter from "./routers/imgsRoutes";
import randomRouter from "./routers/randomRoutes";
import trendingRouter from "./routers/trendingRouter";
const { xss } = require("express-xss-sanitizer");

// ENV SETTING ------------------------------------------
const httpLogger = require("pino-http")();
const logger = pino({ level: "debug" });
dotenv.config({ path: ".env" });

// Uncaught Exception Handling (Synchronous) ------------
process.on("uncaughtException", (err: Error) => {
  logger.error(err, "uncaught exception errors occurred");
  logger.error({}, "Shutting down...");
  process.exit(1);
});

// EXPRESS -----------------------------------------------
const app = express();

// GLOBAL MIDDLEWARES ------------------------------------
// Set CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (!ORIGINS || ORIGINS.length <= 0) return cb(null, true);

      if (ORIGINS.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not " +
          "allow access from the specified origin";
        return cb(new Error(msg), false);
      }

      return cb(null, true);
    },
    credentials: true,
  })
);

// Set security HTTP headers
app.use(helmet());

// Limit 100 requests / 1 min
const limiter = rateLimit({
  max: RATE_LIMIT_AMOUNT,
  windowMs: RATE_LIMIT_MIN * 60 * 1000,
  message: "Too many reqs from this IP, please try again in an hour",
});
app.use("/archon-api", limiter);

// Body parser reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// Form pareser w/ qs module
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitize data against XSS
// filter helper fn
const unless = function (path: string, middleware: any) {
  return function (req: Request, res: Response, next: any) {
    if (path === req.path) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
};
app.use(unless("/archon-api/v1/insights", xss()));

// Prevent parameter pollution
app.use(hpp());

// Cookie parser
app.use(cookieParser());

// File Uploader
app.use(fileUpload());

// MIDDLEWARES -------------------------------------------
// Logging all http requests
app.all("*", (req, res, next) => {
  httpLogger(req, res);
  next();
});

// Routing
app.use("/archon-api/v1/topics", topicRouter);
app.use("/archon-api/v1/users", userRouter);
app.use("/archon-api/v1/insights", insightRouter);
app.use("/archon-api/v1/covers", coverRouter);
app.use("/archon-api/v1/auth", authRouter);
app.use("/archon-api/v1/me", meRouter);
app.use("/archon-api/v1/imgs", imgsRouter);
app.use("/archon-api/v1/trending", trendingRouter);
app.use("/archon-api/v1/random", randomRouter);

// Other Routes Handling
app.all("*", (_req, _res, next) => {
  next(new NotFoundError(`Can not find on this server`));
});

// Error Handling
app.use(globalErrorHandler);

// SERVER RUN --------------------------------------------
const server = app.listen(PORT, () => {
  logger.info({}, `App running on port... ${PORT}`);
});

// Unexpected Rejection Handling (Asynchronous) ----------
process.on("unhandledRejection", (err: Error) => {
  logger.error(err, "unhandled rejection errors occurred");
  logger.error({}, "Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
