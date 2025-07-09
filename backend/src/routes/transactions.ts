import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';

const router = Router();

router.get('/', transactionController.getTransactions.bind(transactionController));
router.get('/stats', transactionController.getTransactionStats.bind(transactionController));
router.get('/recent', transactionController.getRecentTransactions.bind(transactionController));
router.get('/export', transactionController.exportTransactions.bind(transactionController));
router.post('/sync/:address', transactionController.syncWalletTransactions.bind(transactionController));
router.post('/sync-all', transactionController.syncAllWalletTransactions.bind(transactionController));
router.delete('/cleanup', transactionController.cleanupOldTransactions.bind(transactionController));

router.get('/historical-stats', transactionController.getHistoricalDataStats.bind(transactionController));
router.get('/analytics', transactionController.getHistoricalAnalytics.bind(transactionController));
router.get('/export-historical', transactionController.exportHistoricalTransactions.bind(transactionController));
router.post('/cleanup-archive', transactionController.cleanupWithArchive.bind(transactionController));

export default router;