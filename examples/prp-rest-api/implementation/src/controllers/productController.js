const productService = require('../services/productService');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class ProductController {
  async list(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || '-createdAt',
        filters: {},
        fields: req.query.fields?.split(',')
      };

      // Build filters from query params
      if (req.query.category) {
        options.filters.category = req.query.category;
      }
      if (req.query.minPrice) {
        options.filters.price = { ...options.filters.price, $gte: parseFloat(req.query.minPrice) };
      }
      if (req.query.maxPrice) {
        options.filters.price = { ...options.filters.price, $lte: parseFloat(req.query.maxPrice) };
      }
      if (req.query.inStock) {
        options.filters.stock = { $gt: 0 };
      }
      if (req.query.isActive !== undefined) {
        options.filters.isActive = req.query.isActive === 'true';
      }

      const result = await productService.list(options);
      
      // Add cache headers
      res.set('Cache-Control', 'public, max-age=60');
      
      return successResponse(res, 200, 'Products retrieved successfully', {
        products: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error listing products:', error);
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return errorResponse(res, 400, 'Search query must be at least 2 characters');
      }

      const result = await productService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return successResponse(res, 200, 'Search completed successfully', {
        query: q,
        products: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error searching products:', error);
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);
      
      if (!product) {
        return errorResponse(res, 404, 'Product not found');
      }

      // Add cache headers
      res.set('Cache-Control', 'public, max-age=300');
      res.set('ETag', `"${product._id}-${product.updatedAt.getTime()}"`);

      return successResponse(res, 200, 'Product retrieved successfully', { product });
    } catch (error) {
      logger.error(`Error getting product ${req.params.id}:`, error);
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = req.body;
      data.createdBy = req.user.id;
      
      const product = await productService.create(data);
      
      logger.info(`Product created: ${product._id} by user ${req.user.id}`);
      
      return successResponse(res, 201, 'Product created successfully', { 
        product,
        links: {
          self: `/api/v1/products/${product._id}`,
          update: `/api/v1/products/${product._id}`,
          delete: `/api/v1/products/${product._id}`
        }
      });
    } catch (error) {
      logger.error('Error creating product:', error);
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = req.body;
      data.updatedBy = req.user.id;
      
      const product = await productService.update(req.params.id, data);
      
      if (!product) {
        return errorResponse(res, 404, 'Product not found');
      }

      logger.info(`Product updated: ${product._id} by user ${req.user.id}`);

      return successResponse(res, 200, 'Product updated successfully', { product });
    } catch (error) {
      logger.error(`Error updating product ${req.params.id}:`, error);
      next(error);
    }
  }

  async patch(req, res, next) {
    try {
      const data = req.body;
      data.updatedBy = req.user.id;
      
      const product = await productService.patch(req.params.id, data);
      
      if (!product) {
        return errorResponse(res, 404, 'Product not found');
      }

      logger.info(`Product patched: ${product._id} by user ${req.user.id}`);

      return successResponse(res, 200, 'Product updated successfully', { product });
    } catch (error) {
      logger.error(`Error patching product ${req.params.id}:`, error);
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const success = await productService.delete(req.params.id);
      
      if (!success) {
        return errorResponse(res, 404, 'Product not found');
      }

      logger.info(`Product deleted: ${req.params.id} by user ${req.user.id}`);

      return res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting product ${req.params.id}:`, error);
      next(error);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { quantity, operation } = req.body;
      
      const product = await productService.updateStock(
        req.params.id,
        quantity,
        operation
      );
      
      if (!product) {
        return errorResponse(res, 404, 'Product not found');
      }

      logger.info(`Stock updated for product ${req.params.id}: ${operation} ${quantity} by user ${req.user.id}`);

      return successResponse(res, 200, 'Stock updated successfully', { 
        product,
        stockUpdate: {
          operation,
          quantity,
          newStock: product.stock
        }
      });
    } catch (error) {
      logger.error(`Error updating stock for product ${req.params.id}:`, error);
      
      if (error.message === 'Insufficient stock') {
        return errorResponse(res, 400, error.message);
      }
      
      next(error);
    }
  }
}

module.exports = new ProductController();