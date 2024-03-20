import { z } from 'zod';
import { isEmailMessage, isEmailType, isNoSpecialOrBlankMessage, isNotSpecialOrBlank, toArray, toCamelCase } from '../utils/helper';


export const ROLES = ['admin', 'editor', 'writer', 'user'] as const;
const UserExtraSchema = z.object({
  avatar: z.string().optional(),
  job_title: z.string().optional(),
  biography: z.string().optional(),
  careers: z.string().transform(val => toArray(val)).optional(),
  topics: z.string().transform(val => toArray(val)).optional(),
})

export const UserReqSchema = z.object({
  email: z.string().refine(isEmailType, isEmailMessage),
  password: z.string(),
  password_confirm: z.string(),
  first_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage),
  last_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage),
  role: z.enum(ROLES).optional(),
}).merge(UserExtraSchema)
  .transform((data) => toCamelCase(data));
export type UserType = z.infer<typeof UserReqSchema>;

export const UserUpdateSchema = z.object({
  role: z.string().optional(),
  past_password: z.string().optional(),
  password: z.string().optional(),
  password_confirm: z.string().optional(),
  new_password: z.string().optional(),
  new_password_confirm: z.string().optional(),
  first_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage).optional(),
  last_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage).optional(),
}).merge(UserExtraSchema).transform((data) => toCamelCase(data));

export type UserUpdateType = z.infer<typeof UserUpdateSchema>;