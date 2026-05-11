const express = require('express');
const router = express.Router();
const {
  initializeSubscription,
  getUserSubscriptions,
  cancelSubscriptionHandler,
  upgradeSubscription
} = require('../controllers/subscriptionController');

// POST /api/subscriptions/initialize - Start a new subscription with 14-day trial
router.post('/initialize', initializeSubscription);

// GET /api/subscriptions/:userId - Get all subscriptions for a user
router.get('/:userId', getUserSubscriptions);

// POST /api/subscriptions/:subscriptionId/cancel - Cancel a subscription
router.post('/:subscriptionId/cancel', cancelSubscriptionHandler);

// POST /api/subscriptions/:subscriptionId/upgrade - Upgrade/downgrade plan
router.post('/:subscriptionId/upgrade', upgradeSubscription);

module.exports = router;
