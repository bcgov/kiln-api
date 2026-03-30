import { NextFunction, Response } from 'express';
import CacheService, { AttachmentCache } from '../services/cache.service';
import { AuthenticatedRequest } from './auth.middleware';
import L from '../../common/logger';

export interface RequestWithCache extends AuthenticatedRequest {
  attachmentCache?: AttachmentCache;
  attachmentId?: string;
}

export async function withAttachmentCache(
  req: RequestWithCache,
  res: Response,
  next: NextFunction
) {
  const attachmentId = req.body.attachmentId || req.query.attachmentId;
  if (!attachmentId || typeof attachmentId !== 'string') {
    L.error({ route: req.path }, 'attachmentId required');
    res.status(400).json({
      error: 'attachmentId is required',
    });
    return;
  }
  req.attachmentId = attachmentId;
  const attachmentCache = await CacheService.getAttachment(attachmentId);
  if (attachmentCache) {
    L.debug(`Cache hit for ${attachmentId}`);
    req.attachmentCache = attachmentCache;
  } else {
    L.debug(`Cache miss for ${attachmentId}`);
  }
  next();
}
