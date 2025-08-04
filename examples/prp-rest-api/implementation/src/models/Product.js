const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters long'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: ['electronics', 'clothing', 'food', 'books', 'toys', 'other'],
      message: '{VALUE} is not a valid category'
    }
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.stock > 0 && this.isActive;
});

// Pre-save middleware to generate SKU if not provided
productSchema.pre('save', function(next) {
  if (!this.sku) {
    this.sku = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  }
  next();
});

// Instance methods
productSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'add') {
    this.stock += quantity;
  } else {
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
  }
  return this.save();
};

// Static methods
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

productSchema.statics.searchProducts = function(query) {
  return this.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;