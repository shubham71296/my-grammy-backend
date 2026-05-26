const express = require('express');
const router = express.Router();

const catalogRouter = express.Router();
catalogRouter.use(require('./catalog/catalog-instrument-api').router);
catalogRouter.use(require('./catalog/catalog-course-api').router);
router.use('/catalog', catalogRouter);

router.use('/admin', require('./admin/admin-instrument-api').router);
router.use('/admin', require('./admin/admin-course-api').router);
router.use('/admin', require('./admin/admin-user-api').router);

router.use('/user', require('./user/user-auth-api').router);
router.use('/user', require('./user/user-cart-api').router);
router.use('/user', require('./user/user-payment-api').router);
router.use('/user', require('./user/user-order-api').router);

const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
router.use('/upload', auth, requireAdmin, require('./upload').router);
router.use('/upload', auth, requireAdmin, require('./upload-multipart').router);
router.use('/video', require('./video').router);

module.exports = router;
