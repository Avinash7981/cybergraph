import { Router } from 'express';
import { getMonitoringState, updateNodeStatus, streamMonitoringEvents } from '../controllers/monitoringController';

const router = Router();

router.get('/networks/:networkId', getMonitoringState);
router.put('/networks/:networkId/nodes/:nodeId/status', updateNodeStatus);
router.get('/networks/:networkId/stream', streamMonitoringEvents);

export default router;
