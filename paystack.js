const https = require('https');

// Helper to make HTTPS requests
function makeHttpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Initialize one-time transaction
function initializeTransaction({ email, amount, cartId, plan_code } = {}) {
  const params = {
    email,
    amount,
  };
  if (cartId) params.cartId = cartId;
  if (plan_code) params.plan = plan_code; // For subscription plans

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction/initialize',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return makeHttpsRequest(options, params);
}

// Create a subscription for a customer
function createSubscription({ customer, plan, authorization_code, start_date } = {}) {
  const params = {
    customer,
    plan,
  };
  if (authorization_code) params.authorization = authorization_code;
  if (start_date) params.start_date = start_date;

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/subscription',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return makeHttpsRequest(options, params);
}

// Fetch subscription details
function fetchSubscription(subscription_code) {
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/subscription/${subscription_code}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return makeHttpsRequest(options);
}

// Cancel a subscription
function cancelSubscription(subscription_code, token) {
  const params = { token };

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/subscription/${subscription_code}/disable`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return makeHttpsRequest(options, params);
}

// Update subscription (upgrade/downgrade)
function updateSubscription(subscription_code, { plan } = {}) {
  const params = { plan };

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/subscription/${subscription_code}`,
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return makeHttpsRequest(options, params);
}

module.exports = {
  initializeTransaction,
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  updateSubscription
};