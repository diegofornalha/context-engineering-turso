const router = require('express').Router();
const productController = require('../controllers/productController');
const validate = require('../middleware/validation');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

// GET /products - List all products with pagination
router.get(
  '/',
  cache.short,
  validate.listProduct,
  productController.list
);

// GET /products/search - Search products
router.get(
  '/search',
  validate.searchProduct,
  productController.search
);

// GET /products/:id - Get single product
router.get(
  '/:id',
  cache.medium,
  validate.getProduct,
  productController.get
);

// POST /products - Create new product
router.post(
  '/',
  auth.required,
  auth.hasRole('admin', 'manager'),
  validate.createProduct,
  productController.create
);

// PUT /products/:id - Update entire product
router.put(
  '/:id',
  auth.required,
  auth.hasRole('admin', 'manager'),
  validate.updateProduct,
  productController.update
);

// PATCH /products/:id - Partial update
router.patch(
  '/:id',
  auth.required,
  auth.hasRole('admin', 'manager'),
  validate.patchProduct,
  productController.patch
);

// DELETE /products/:id - Delete product
router.delete(
  '/:id',
  auth.required,
  auth.hasRole('admin'),
  validate.deleteProduct,
  productController.delete
);

// POST /products/:id/stock - Update stock
router.post(
  '/:id/stock',
  auth.required,
  auth.hasRole('admin', 'manager', 'warehouse'),
  validate.updateStock,
  productController.updateStock
);

module.exports = router;