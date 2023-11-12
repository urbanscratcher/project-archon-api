import { Response } from 'express';
import { BadRequestError } from "../classes/Errors";
import _, { snakeCase, isArray, transform, isObject } from "lodash";

export function toArray(str: string) {
  return JSON.parse(str.replace(/'/g, '"'));
}


export function areRequired([...args]: Array<any>, [...names]: Array<string>) {
  args.forEach((arg, idx) => {
    if (arg === null || arg === undefined) {
      throw new BadRequestError(`${names[idx]} is required`);
    }
  })
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
  return _.transform(obj, (acc: any, value: any, key: any, target: any) => {
    const camelKey = _.isArray(target) ? key : _.snakeCase(key);
    acc[camelKey] = _.isObject(value) ? toSnakeCase(value) : value;
  });
}

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

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));