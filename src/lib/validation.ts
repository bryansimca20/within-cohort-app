import { z } from 'zod';
export const SESSION_TYPES = ['easy','long','tempo','interval','recovery','race','other'] as const;
export const checkinSchema = z.object({
  recovery: z.coerce.number().int().min(0).max(100),
  restingHr: z.coerce.number().int().min(25).max(120),
  // Optional: blank must reach here as undefined, never as '' or null,
  // both of which z.coerce.number() would turn into a real 0.
  hrvMs: z.coerce.number().int().min(1).max(300).optional(),
  // Whole minutes, parsed from the form's 'h:mm' entry by parseHhMm. 960 is
  // 16:00, the same implausibility ceiling the old decimal-hours field had.
  sleepMinutes: z.coerce.number().int().min(0).max(960),
  hooperSleep: z.coerce.number().int().min(1).max(5),
  hooperFatigue: z.coerce.number().int().min(1).max(5),
  hooperSoreness: z.coerce.number().int().min(1).max(5),
  hooperStress: z.coerce.number().int().min(1).max(5),
  note: z.string().max(1000).optional(),
});
export const sessionSchema = z.object({
  sessionType: z.enum(SESSION_TYPES),
  sessionTypeOther: z.string().max(80).optional(),
  rpe: z.coerce.number().int().min(0).max(10),
  durationMin: z.coerce.number().int().min(1).max(600),
  distanceKm: z.coerce.number().min(0).max(100),
  tookServing: z.boolean().optional(),
  note: z.string().max(1000).optional(),
}).refine((v) => v.sessionType !== 'other' || !!v.sessionTypeOther, { path: ['sessionTypeOther'], message: 'Required' });
export type CheckinInput = z.infer<typeof checkinSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
