import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = {
      id: decoded.sub,
      role: decoded.role
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  });
}
