import { Request, Response } from 'express';
import { isArray, isObject, snakeCase, transform } from "lodash";
import { BadRequestError } from "../classes/Errors";

// Parsing ---------------------------------
export function toArray(str: string) {
  return JSON.parse(str.replace(/'/g, '"'));
}


export function toMysqlDate(date?: Date): string {
  if (!date) date = new Date();
  const formatTime = (time: number): string => time > 10 ? `${time}` : '0' + time;

  const year = date.getFullYear();
  const month = formatTime(date.getMonth() + 1);
  const day = formatTime(date.getDate());
  const hour = formatTime(date.getHours());
  const min = formatTime(date.getMinutes());
  const sec = formatTime(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}


export function nullableField(obj: any) {
  return `${obj ? "'" + obj + "'" : 'NULL'}`
}


function toSnakeCase(obj: any) {
  return transform(obj, (acc: any, value: any, key: any, target: any) => {
    const camelKey = isArray(target) ? key : snakeCase(key);
    acc[camelKey] = isObject(value) ? toSnakeCase(value) : value;
  });
}

export function parseOrderQuery(str: string) {
  if (str.slice(0, 1) === '-') {
    return `${str.slice(1, str.length)} DESC`;
  } else {
    return `${str} ASC`;
  }
}

export const makeUpdateSentence = (obj: any, name: string) => {
  if (obj) {
    return `${name}=${typeof obj === 'string' ? "'" + obj + "'" : obj},`
  } else {
    return '';
  }
}

// Check validation --------------------------
export function checkRequireds([...args]: Array<any>, [...names]: Array<string>) {
  args.forEach((arg, idx) => {
    if (arg === null || arg === undefined) {
      throw new BadRequestError(`${names[idx]} is required`);
    }
  })
}

export function getValidatedIdx(req: Request) {
  const idx = +req.params?.idx;
  if (isNaN(idx) || idx === null || idx === undefined) {
    throw new BadRequestError(`idx is irregular value`)
  } else {
    return idx;
  }
}

// Respond ------------------------------------
export function respond(res: Response, statusCode: number, obj?: any) {
  res.status(statusCode);
  if (obj) {
    const newObj = toSnakeCase(obj);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(newObj))
  } else {
    res.send();
  }
}

// time to read ------------------------------------
// [REFERENCE] https://infusion.media/content-marketing/how-to-calculate-reading-time/#:~:text=Here's%20the%20formula%3A,the%20decimal%20is%20your%20minutes.
export function calculateTtr(text: string) {
  const words = text.split(" ");
  const wordCount = words.length;
  const ttrRaw = wordCount / 200;
  const min = Math.floor(ttrRaw);
  const sec = Math.round((ttrRaw - min) * 60);
  return min * 60 + sec;
}