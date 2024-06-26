import { Request, Response } from "express";
import pino from "pino";
import { BadRequestError, NotFoundError } from "../dtos/Errors";
import { InsightHitsSchema } from "../schemas/InsightHitsSchema";
import { asyncHandledDB } from "../utils/connectDB";
import { respond, toMysqlDate } from "../utils/helper";
const logger = pino({ level: "debug" });

export const addInsightHits = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const insightIdx = +req.params?.idx || 0;

    if (insightIdx === undefined || insightIdx <= 0) {
      throw new BadRequestError("no insight");
    }

    const insightFound = await conn.query(
      `
    SELECT *
    FROM INSIGHT
    WHERE idx = ?
    AND del_at is null`,
      [insightIdx]
    );

    if (insightFound?.length <= 0) {
      throw new NotFoundError("no insight found");
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress;
    const ipSegments = ip?.split(":") || [];
    const clientIp =
      ipSegments[ipSegments.length - 1] !== "1"
        ? ipSegments[ipSegments.length - 1]
        : "127.0.0.1";

    if (!clientIp) {
      throw new BadRequestError("ip not validated");
    }

    const result = await conn.query(
      `
  INSERT INTO INSIGHT_HITS
  SET
    insight_idx = ?
  , ip = INET_ATON(?)
  , created_at = ?`,
      [insightIdx, clientIp, toMysqlDate()]
    );

    logger.debug({ res: result }, "DB response");

    respond(res, 201, { idx: Number(result?.insertId) });
  }
);

export const getInsightHits = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const insightIdx = +req.params?.idx || 0;

    if (insightIdx === undefined || insightIdx <= 0) {
      throw new BadRequestError("no insight");
    }

    const insightFound = await conn.query(
      `
  SELECT *
  FROM INSIGHT
  WHERE idx = ?
  AND del_at is null`,
      [insightIdx]
    );

    if (insightFound?.length <= 0) {
      throw new NotFoundError("no insight found");
    }

    const result = await conn.query(
      `
    SELECT insight_idx, COUNT(*) as hits
    FROM INSIGHT_HITS ih
    WHERE ih.insight_idx = ?
    GROUP BY ih.insight_idx
  `,
      [insightIdx]
    );

    if (result?.length <= 0) {
      throw new NotFoundError("no insight hits found");
    }

    const data = InsightHitsSchema.parse(result[0]);
    respond(res, 200, data);
  }
);
