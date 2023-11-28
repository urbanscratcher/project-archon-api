import { NextFunction, Request, Response } from "express";
import { asyncHandledDB } from "../utils/connectDB";
import { respond } from "../utils/helper";
import { getUserDB } from "./userController";

export const getMe = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const user = await getUserDB(conn, req.userIdx as number);
  respond(res, 200, user);
})