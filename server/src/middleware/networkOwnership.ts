import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../services/prisma';

export async function requireNetworkOwnership(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const networkId = req.params.networkId || req.params.id || req.body.networkId;
    if (!networkId) {
      return next(); // No networkId in params, skip
    }
    
    // Admin bypass if required
    if (req.user?.role === 'ADMIN') {
      return next();
    }
    
    const network = await prisma.network.findUnique({
      where: { id: networkId },
      select: { ownerId: true }
    });
    
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    
    if (network.ownerId !== req.user?.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
