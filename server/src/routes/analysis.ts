import { Router } from 'express';
import { runBFS, runDFS, runDijkstra, runComparison, runRiskAnalysis, generateReport } from '../controllers/analysisController';

const router = Router();

router.post('/bfs', runBFS);
router.post('/dfs', runDFS);
router.post('/dijkstra', runDijkstra);
router.post('/compare', runComparison);
router.post('/risk', runRiskAnalysis);
router.post('/report', generateReport);

export default router;
