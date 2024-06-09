import { v2 as cloudinary } from "cloudinary";
import { NextFunction, Request, Response } from "express";
import pino from "pino";
import { Dto, ListDto } from "../dtos/Dto";
import { NotFoundError } from "../dtos/Errors";
import { QueryReqSchema } from "../dtos/Query";
import { asyncHandledDB } from "../utils/connectDB";
import { BASIC_INSIGHTS_LIMIT } from "../utils/constants";
import {
  checkRequireds,
  getValidUserIdx,
  respond,
  toFilterSql,
  toMysqlDate,
  toSortsSql,
  validateParamIdx,
} from "../utils/helper";
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_NAME,
} from "./../utils/constants";
const logger = pino({ level: "debug" });

class InsightDto extends Dto {
  idx: number;
  title: string;
  thumbnail: string;
  content: string;
  summary: string;
  topic: object;
  createdBy: object;
  createdAt: string;
  editedAt?: string | undefined;

  constructor(obj: Array<any>) {
    super();
    this.idx = obj[0].idx;
    this.title = obj[0].title;
    this.thumbnail = obj[0].thumbnail;
    this.content = obj[0].content;
    this.summary = obj[0].summary;
    this.topic = {
      idx: obj[0].topic_idx,
      name: obj[0].topic_name,
    };
    this.createdBy = {
      idx: obj[0].created_by,
      firstName: obj[0].created_first_name,
      lastName: obj[0].created_last_name,
      avatar: obj[0]?.created_avatar || undefined,
      biography: obj[0]?.created_biography || undefined,
      topics:
        obj.length > 1
          ? obj.map((o: any) => {
              return {
                idx: o.topic_idx,
                name: o.topic_name,
              };
            })
          : undefined,
    };
    this.createdAt = obj[0].created_at.toISOString();
    this.editedAt = obj[0]?.edited_at?.toISOString() || undefined;
  }
}

export const createInsight = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const createdBy = getValidUserIdx(req);
    const {
      title,
      thumbnail,
      content,
      summary,
      topic_idx: topicIdx,
    } = req.body;

    checkRequireds(
      [title, thumbnail, content, summary, topicIdx],
      ["title", "thumbnail", "content", "summary", "topic_idx"]
    );

    const result = await conn.query(
      `
  INSERT INTO INSIGHT
  SET
    title = ?
  , thumbnail = ?
  , content = ?
  , summary = ?
  , topic_idx = ?
  , created_by = ?
  , created_at = ?`,
      [title, thumbnail, content, summary, topicIdx, createdBy, toMysqlDate()]
    );

    logger.debug({ res: result }, "DB response");

    respond(res, 201, { idx: Number(result?.insertId) });
  }
);

export const getInsights = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    // query transform
    const query = QueryReqSchema(BASIC_INSIGHTS_LIMIT).parse(req.query);
    const mapFieldNames: Record<string, string> = {
      insight_idx: "i.idx",
      created_by: "i.created_by",
      topic_idx: "i.topic_idx",
      first_name: "u.first_name",
      last_name: "u.last_name",
    };
    const replaceFieldNames = (str: string) =>
      str.replace(
        /insight_idx|created_by|topic_idx|first_name|last_name/g,
        (matched) => mapFieldNames[matched]
      );

    const filterSql =
      query?.filter &&
      replaceFieldNames(
        toFilterSql(query.filter, [
          "insight_idx",
          "title",
          "created_by",
          "first_name",
          "last_name",
          "topic_idx",
        ])
      );
    const sortsSql =
      query?.sorts &&
      toSortsSql(query.sorts, ["idx", "created_at"])?.map((s) =>
        replaceFieldNames(s)
      );

    // DB
    const foundInsights = await conn.query(
      `
  SELECT tt.total total, tb.*
  FROM (
    SELECT count(*) total
    FROM INSIGHT i
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    LEFT JOIN USER u ON i.created_by = u.idx
    WHERE i.del_at is null
    ${filterSql ? `AND ${filterSql}` : ""}
  ) tt,
  (
    SELECT
      i.idx as idx,
      i.title as title,
      i.thumbnail as thumbnail,
      i.summary as summary,
      i.topic_idx as topic_idx,
      t.name as topic_name,
      i.created_at as created_at,
      i.created_by as created_by,
      u.avatar as created_avatar,  	
      u.biography as created_biography,
      u.first_name as created_first_name,
      u.last_name as created_last_name,
      i.edited_at as edited_at
    FROM INSIGHT i
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    LEFT JOIN USER u ON i.created_by = u.idx
    WHERE i.del_at is null
    ${filterSql ? `AND ${filterSql}` : ""}
    ORDER BY ${sortsSql ? sortsSql : "idx DESC"}
    LIMIT ? OFFSET ?
  ) tb
  `,
      [query.limit, query.offset]
    );

    const total = foundInsights.length > 0 ? Number(foundInsights[0].total) : 0;

    // stringify
    const insights = foundInsights.map((i: any) => new InsightDto([i]));

    const insightList = new ListDto<InsightDto>(
      insights,
      total,
      query.offset,
      query.limit
    );

    respond(res, 200, insightList);
  }
);

export const getInsight = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const idx = validateParamIdx(req);

    const foundInsights = await conn.query(
      `SELECT
    i.idx as idx,
    i.title as title,
    i.thumbnail as thumbnail,
    i.content as content,
    i.summary as summary,
    i.topic_idx as topic_idx,
    i.created_at as created_at,
    i.created_by as created_by,
    i.edited_at as edited_at,
    i.edited_by as edited_by,
    cu.first_name as created_first_name,
    cu.last_name as created_last_name,
    cu.avatar as created_avatar,
    cu.biography as created_biography,
    t.name as topic_name,
    t2.seq as created_topic_seq,
    t2.idx as created_topic_idx,
    t2.name as created_topic_name
  FROM INSIGHT i
  LEFT JOIN USER cu ON i.created_by = cu.idx
  LEFT JOIN USER_TOPIC ut ON i.created_by = ut.user_idx
  LEFT JOIN TOPIC t2 ON t2.idx  = ut.topic_idx
  LEFT JOIN TOPIC t ON i.topic_idx = t.idx
  WHERE i.idx = ?
  AND i.del_at is null`,
      idx
    );

    if (foundInsights <= 0) {
      throw new NotFoundError("insight not found");
    }

    const insight: InsightDto = new InsightDto(foundInsights);

    respond(res, 200, insight);
  }
);

export const deleteInsight = asyncHandledDB(
  async (conn: any, req: Request, res: Response, next: NextFunction) => {
    const idx = validateParamIdx(req);

    const foundInsights = await conn.query(
      `SELECT * FROM INSIGHT WHERE idx = ? AND del_at is null`,
      idx
    );

    if (foundInsights.length <= 0) {
      throw new NotFoundError("insight not found");
    }

    const result = await conn.query(
      `
  UPDATE INSIGHT SET
    del_at = ?
  WHERE idx = ?`,
      [toMysqlDate(), idx]
    );
    logger.debug({ res: result }, "DB response");

    respond(res, 200);
  }
);

export const updateInsight = asyncHandledDB(
  async (conn: any, req: Request, res: Response, next: NextFunction) => {
    const editedBy = getValidUserIdx(req);
    const idx = validateParamIdx(req);

    // insight exist check
    const foundInsights = await conn.query(
      `SELECT * FROM INSIGHT WHERE idx = ? AND del_at is null`,
      idx
    );
    if (foundInsights?.length <= 0) {
      throw new NotFoundError("insight not found");
    }

    // remove existing thumbnail
    const existingThumbnail = foundInsights[0].thumbnail;

    // check if any thumbnail exists
    const result = await fetch(existingThumbnail, {
      method: "HEAD",
    });

    if (result.status === 200) {
      const thumbFound = existingThumbnail.match(
        `(thumbnails\/).*(?=\.(png|jpg|jpeg|webp))`
      );
      if (thumbFound?.length > 0) {
        const pubId = thumbFound?.length > 0 ? thumbFound[0] : "";

        try {
          const result = await cloudinary.uploader.destroy(pubId);
          logger.info(`removed the existing thumbnail - ${result}`);
        } catch (err) {
          logger.error(err);
        }
      }
    }

    // parse
    const title = req.body?.title ?? null;
    const thumbnail = req.body?.thumbnail ?? null;
    const content = req.body?.content ?? null;
    const summary = req.body?.summary ?? null;
    const topicIdx = req.body?.topic_idx ?? null;

    // process thumbnail image
    if (thumbnail) {
      const thumbnailPath = thumbnail.match(`(image\/).*`);
      const thumbnailFromFound = thumbnail.match(
        `((?=thumbnails\/).+)(?=\.(png|jpg|jpeg|webp))`
      );
      const thumbnailFrom =
        thumbnailFromFound?.length > 0 && thumbnailFromFound[0];
      const thumbnailTo = thumbnailFrom && thumbnailFrom.split("/")[3];

      // cloudinary config
      cloudinary.config({
        cloud_name: CLOUDINARY_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
      });

      // check if any thumbnail exists
      const result = await fetch(
        "https://res.cloudinary.com" +
          `/${CLOUDINARY_NAME}/${thumbnailPath[0]}`,
        {
          method: "HEAD",
        }
      );

      if (result.status === 200) {
        // move thumbnail
        await cloudinary.uploader
          .rename(thumbnailFrom, `thumbnails/${thumbnailTo}`)
          .then(async (result) => {
            // clear all imgs in temp
            cloudinary.search
              .expression(`folder:thumbnails/temp/${editedBy}`)
              .max_results(30)
              .execute()
              .then((result) => {
                if (result.total_count > 0) {
                  result.resources.forEach((el: any) => {
                    cloudinary.uploader
                      .destroy(el.public_id)
                      .then((result) => logger.debug(result))
                      .catch((err) => logger.error(err));
                  });
                } else {
                  logger.info("No temp images to be removed found");
                }
              })
              .catch((err) => logger.warn(err));

            await conn.query(
              `
      UPDATE INSIGHT SET
        title = ?,
        thumbnail = ?,
        content = ?,
        summary = ?,
        topic_idx = ?,
        edited_by = ?,
        edited_at = ?   
      WHERE idx = ?
    `,
              [
                title,
                result.secure_url,
                content,
                summary,
                topicIdx,
                editedBy,
                toMysqlDate(),
                idx,
              ]
            );
          })
          .catch((err) => console.error(err));
      }
    } else {
      await conn.query(
        `
    UPDATE INSIGHT SET
      title = ?,
      content = ?,
      summary = ?,
      topic_idx = ?,
      edited_by = ?,
      edited_at = ?   
    WHERE idx = ?
  `,
        [title, content, summary, topicIdx, editedBy, toMysqlDate(), idx]
      );
    }

    respond(res, 200);
  }
);
