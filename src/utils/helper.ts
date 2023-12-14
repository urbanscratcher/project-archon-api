import { Request, Response } from 'express';
import { camelCase, isArray, isObject, snakeCase, transform } from "lodash";
import { BadRequestError, UnauthenticatedError } from "../dtos/Errors";
import { Filter } from '../dtos/Query';

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

export function toCamelCase(obj: any) {
  return transform(obj, (acc: any, value: any, key: any, target: any) => {
    const snakeKey = isArray(target) ? key : camelCase(key);
    acc[snakeKey] = isObject(value) ? toCamelCase(value) : value;
  });
}


export function toSnakeCase(obj: any) {
  return transform(obj, (acc: any, value: any, key: any, target: any) => {
    const camelKey = isArray(target) ? key : snakeCase(key);
    acc[camelKey] = isObject(value) ? toSnakeCase(value) : value;
  });
}

// Parse sorts queries to SQL strings
export function toSortsSql(inputArr: string[] | undefined, allowed: string[]) {
  const res = inputArr?.map((v) => toSortSql(v, allowed));
  return res && res.length > 0 ? res : undefined
}

// Parse sort query to SQL string
export function toSortSql(input: string, allowedFields: string[]): string {
  const isDescending: boolean = input.slice(0, 1) === '-' ? true : false;
  const direction = isDescending ? 'DESC' : 'ASC';
  const field = isDescending ? input.slice(1, input.length) : input;

  // whitelist check
  const isAllowed = allowedFields.includes(field);

  if (!isAllowed) {
    throw new BadRequestError('proper order query needed');
  }

  return `${field} ${direction}`
}

type InputFilters = {
  and?: Record<string, string>[]
  or?: Record<string, string>[]
}

type ParsedFilters = {
  and?: Filter[][],
  or?: Filter[][]
}



function isFieldsAllowed(arr: Record<string, string>[], allowedFields: string[]) {
  return arr.every((i) => {
    return Object.keys(i).every((k) => allowedFields.includes(k));
  })
}

// Parse filter query
function parseFilters(input: InputFilters, allowedFields: string[]): ParsedFilters {

  // for operator
  allowedFields.push('or', 'and');

  // whitelist check
  const orAllowed = input?.or ? isFieldsAllowed(input.or, allowedFields) : true;
  const andAllowed = input?.and ? isFieldsAllowed(input.and, allowedFields) : true;

  if (!orAllowed || !andAllowed) {
    throw new BadRequestError('proper filter query needed');
  }

  const parseFilter = (filterObj: {}): Filter[] => {
    let filters: Filter[] = []
    for (const [k, v] of Object.entries(filterObj)) {
      const values = (v as string).split(':');

      const hasOperator = values.length > 1;
      const operator = hasOperator ? values[0] : '=';
      const value = hasOperator ? values[1] : values[0];

      filters.push({ field: k, operator, value });
    }
    return filters
  }

  return {
    and: input?.and ? input?.and.map((arr) => parseFilter(arr)) : undefined,
    or: input?.or ? input?.or.map((arr) => parseFilter(arr)) : undefined
  }
}

function makeFilterSql(parsedFilters: ParsedFilters) {
  const makeSql = (filters: Filter[], operator: "AND" | "OR") => {
    return filters ? "(" + filters.map((f: Filter) => {
      let operatorStr = f.operator;
      let valueStr = f.value;

      if (f.operator === 'like') {
        valueStr = `%${f.value}%`
      }
      return `${f.field} ${operatorStr} '${valueStr}'`
    }).join(` ${operator} `) + ")" : '';
  }

  const andSqls = parsedFilters?.and ? parsedFilters?.and.map((f) => makeSql(f, 'AND')) : undefined;
  const orSqls = parsedFilters?.or ? parsedFilters?.or.map((f) => makeSql(f, 'OR')) : undefined;

  const sqlArr = []
  if (andSqls) sqlArr.push("(" + andSqls.join(' OR ') + ")");
  if (orSqls) sqlArr.push("(" + orSqls.join(' OR ') + ")");
  const sql = sqlArr.join(' AND ')
  return sql;
}

export function toFilterSql(input: {}, allowedFields: string[]): string {
  const parsedFilters = parseFilters(input, allowedFields);
  const filterSqls = makeFilterSql(parsedFilters);
  return filterSqls;

}


// Check validation --------------------------
export function checkRequireds([...args]: Array<any>, [...names]: Array<string>) {
  args.forEach((arg, idx) => {
    if (arg === null || arg === undefined) {
      throw new BadRequestError(`${names[idx]} is required`);
    }
  })
}

export function getValidUserIdx(req: Request) {
  const userIdx = req.userIdx ?? null;
  if (userIdx === null || userIdx === undefined || !Number.isInteger(+userIdx)) {
    throw new UnauthenticatedError(`user idx is not found`)
  } else {
    return userIdx;
  }
}

export function validateParamIdx(req: Request) {
  const idx = +req.params?.idx;
  console.log(idx);
  if (idx === null || idx === undefined || !Number.isInteger(+idx)) {
    throw new BadRequestError(`idx is irregular value`)
  } else {
    return idx;
  }
}


// for zod refinement
export const isNotSpecialOrBlank = (inputStr: string) =>
  inputStr.search(/\s|\W/g) <= -1;

export const isNoSpecialOrBlankMessage = { message: 'blank or special character should not be included' }

export const isEmailType = (emailStr: string) => {
  const regEx = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regEx.test(emailStr);
}

export const isEmailMessage = { message: 'invalid format' }


// general
export const isSpecialOrBlank = (inputStr: string) => {
  if (inputStr.search(/\W|\s/g) > -1) {
    throw new BadRequestError('special characters or blank should not be included')
  }
}

export const isNumber = (inputStr: string) => {
  if (inputStr.search(/^\d+$/g)) {
    throw new BadRequestError('should be number')
  }
}


export const isEmail = (emailStr: string) => {
  const regEx = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!regEx.test(emailStr)) {
    throw new BadRequestError('email is not a valid format')
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