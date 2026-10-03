import { Router } from 'express';
import { register, login, me, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', logout);

export default router;
