import { z } from "zod";
import { toCamelCase } from "../utils/helper";

export const CoverReqSchema = z
  .object({
    insight_idx: z.number(),
  })
  .transform((data) => toCamelCase(data));

export type CoverReq = z.infer<typeof CoverReqSchema>;
