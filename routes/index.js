const express = require('express');
const router = express.Router();

router.use('/admin', require('./admin/admin-instrument-api').router);
router.use('/admin', require('./admin/admin-course-api').router);
router.use('/admin', require('./admin/admin-user-api').router);

router.use('/user', require('./user/user-auth-api').router);
router.use('/user', require('./user/user-cart-api').router);
router.use('/user', require('./user/user-payment-api').router);
router.use('/user', require('./user/user-order-api').router);

router.use('/testing', require('./testing/testing-api').router);

router.use('/upload', require('./upload').router);
router.use('/upload', require('./upload-multipart').router);
router.use('/video', require('./video').router);

module.exports = router;
