import { Router } from 'express';
import { walletController } from '../controllers/walletController';

const router = Router();

router.get('/', walletController.getAllWallets.bind(walletController));
router.get('/stats', walletController.getWalletStats.bind(walletController));
router.get('/with-stats', walletController.getWalletsWithStats.bind(walletController));
router.get('/top-active', walletController.getTopActiveWallets.bind(walletController));
router.post('/discover', walletController.discoverTopHolders.bind(walletController));
router.get('/:address', walletController.getWalletByAddress.bind(walletController));
router.patch('/:address/balance', walletController.updateWalletBalance.bind(walletController));
router.patch('/:address/status', walletController.toggleWalletStatus.bind(walletController));

router.post('/discover-bulk', walletController.discoverBulkHolders.bind(walletController));
router.post('/sync-historical', walletController.syncHistoricalData.bind(walletController));
router.get('/sync-status', walletController.getSyncStatus.bind(walletController));

export default router;