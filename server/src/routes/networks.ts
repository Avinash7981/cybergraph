import { Router } from 'express';
import {
  listNetworks,
  createNetwork,
  getNetwork,
  updateNetwork,
  deleteNetwork,
  importNetwork,
} from '../controllers/networkController';
import { listNodes, createNode, updateNode, deleteNode } from '../controllers/nodeController';
import { listEdges, createEdge, updateEdge, deleteEdge } from '../controllers/edgeController';
import { exportNetwork } from '../controllers/analysisController';

const router = Router();

// Networks
router.get('/', listNetworks);
router.post('/', createNetwork);
router.post('/import', importNetwork);
router.get('/:id', getNetwork);
router.put('/:id', updateNetwork);
router.delete('/:id', deleteNetwork);
router.get('/:id/export', exportNetwork);

// Nodes
router.get('/:networkId/nodes', listNodes);
router.post('/:networkId/nodes', createNode);
router.put('/:networkId/nodes/:nodeId', updateNode);
router.delete('/:networkId/nodes/:nodeId', deleteNode);

// Edges
router.get('/:networkId/edges', listEdges);
router.post('/:networkId/edges', createEdge);
router.put('/:networkId/edges/:edgeId', updateEdge);
router.delete('/:networkId/edges/:edgeId', deleteEdge);

export default router;
