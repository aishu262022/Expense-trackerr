const mongoose = require('mongoose');

const SavingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 1
  },
  savedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
SavingsSchema.index({ userId: 1, status: 1 });
SavingsSchema.index({ userId: 1, createdAt: -1 });

// Virtual for progress percentage
SavingsSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount <= 0) return 0;
  return Math.min(100, (this.savedAmount / this.targetAmount) * 100);
});

// Virtual for remaining amount
SavingsSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.targetAmount - this.savedAmount);
});

// Method to check if goal is completed
SavingsSchema.methods.isCompleted = function() {
  return this.savedAmount >= this.targetAmount && this.targetAmount > 0;
};

// Pre-save middleware to update status
SavingsSchema.pre('save', function(next) {
  if (this.isCompleted()) {
    this.status = 'completed';
  } else if (this.status === 'completed' && !this.isCompleted()) {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Savings', SavingsSchema);
