import { NextFunction, Request, Response } from "express";
import { asyncHandled, asyncHandledDB } from "../utils/connectDB";
import { ResponseCallback, v2 as cloudinary } from 'cloudinary';
// @ts-ignore
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_NAME } from "../utils/constants";
import { getValidUserIdx, respond, validateParamIdx } from "../utils/helper";
import { BadRequestError, InternalError, NotFoundError } from "../dtos/Errors";
import { Readable } from "stream";

interface FileRequest extends Request {
  files?: any;
}

export const createAvatar = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  // validate user
  const idx = getValidUserIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is NULL`, idx);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  createImg(req, res, "avatars", `_${idx}_${Date.now()}`);
})

export const deleteAvatar = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  // validate user
  const idx = getValidUserIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is NULL`, idx);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  const avatarUrl = foundUsers[0]?.avatar;
  if (!avatarUrl) return res.status(204)
  deleteImg(avatarUrl, "avatars", (err, result) => {
    if (err) throw new InternalError('failed to delete')
    return result && result?.result !== 'not found' ? respond(res, 200) : respond(res, 204)
  });
})

const createImg = (req: Request, res: Response, folderName: string, addedFileName: string) => {
  const fileRequest = req as FileRequest
  const file = fileRequest.files?.avatar;

  // error when no files exist
  if (!fileRequest?.files || Object.keys(fileRequest?.files).length === 0 || !file) {
    throw new BadRequestError('No files were uploaded')
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  const fileName = file.name.split(".")[0]
  const options = { public_id: fileName + addedFileName, folder: folderName };

  const transformStream = cloudinary.uploader.upload_stream(options, (err, result) => {
    if (err) throw new InternalError('Upload failed. Try again');
    res.json({ url: result?.secure_url })
    return respond(res, 201)
  })

  let str = Readable.from(file.data);
  str.pipe(transformStream);
}

const deleteImg = (imgUrl: string, folderName: string, callback: ResponseCallback | undefined) => {
  const publicId = imgUrl.substring(imgUrl.lastIndexOf('/') + 1, imgUrl.lastIndexOf('.'));

  cloudinary.config({
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  cloudinary.uploader.destroy(folderName + "/" + publicId, callback);
}
