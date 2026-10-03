import { Request, Response } from 'express';
import { authService } from '../services/authService';
import prisma from '../services/prisma';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'USER'
      }
    });

    const token = authService.generateToken(user.id, user.role);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error: any) {
    console.error('Register error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = await authService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = authService.generateToken(user.id, user.role);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error: any) {
    console.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    res.json({ id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role });
  } catch (error: any) {
    console.error('Me error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true });
}
