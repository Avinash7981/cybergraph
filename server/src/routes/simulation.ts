import { Router } from 'express';
import { runSimulation } from '../controllers/simulationController';

const router = Router();

router.post('/attack', runSimulation);

export default router;
