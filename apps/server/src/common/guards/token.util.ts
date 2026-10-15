import type { Request } from 'express';

export function extractBearer(req: Request): string | undefined {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}
