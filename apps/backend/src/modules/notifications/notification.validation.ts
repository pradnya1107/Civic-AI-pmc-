import { z } from "zod";

export const notificationIdSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();

export const notificationListQuerySchema = z
  .object({
    page: z.string().regex(/^[1-9]\d{0,5}$/).optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).optional(),
  })
  .strict()
  .refine((query) => !query.limit || Number(query.limit) <= 100);
