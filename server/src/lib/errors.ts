import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Errors carry a stable machine-readable `code`; clients translate codes into the user's language. */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export const badRequest = (code = 'bad_request') => new HttpError(400, code);
export const unauthorized = (code = 'unauthorized') => new HttpError(401, code);
export const forbidden = (code = 'forbidden') => new HttpError(403, code);
export const notFound = (code = 'not_found') => new HttpError(404, code);
export const conflict = (code = 'conflict') => new HttpError(409, code);

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const ah = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch(next);
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const e = err as { type?: string; code?: string; status?: number };
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  if (e?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file_too_large' });
  console.error(err);
  return res.status(500).json({ error: 'internal_error' });
}
