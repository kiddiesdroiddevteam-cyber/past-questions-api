const { supabase } = require('../supabase/supabaseClient');
const {
  initializeTransaction,
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  updateSubscription
} = require('../paystack');

// Initialize a subscription (start with 14-day trial)
async function initializeSubscription(req, res) {
  try {
    const { email, plan, plan_code, userId } = req.body;

    if (!email || !plan || !plan_code || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: email, plan, plan_code, userId' 
      });
    }

    // Check if user already has active subscription
    const { data: existingSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return res.status(409).json({ 
        success: false, 
        message: 'User already has an active subscription' 
      });
    }

    // Initialize Paystack transaction
    const paystackResponse = await initializeTransaction({
      email,
      amount: 0, // Trial subscription starts at 0
      plan_code
    });

    if (!paystackResponse.status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paystack initialization failed',
        error: paystackResponse.message 
      });
    }

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create subscription record in database with trial status
    const { data: subscription, error: createError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan,
          plan_code,
          status: 'trial',
          customer_email: email,
          trial_end_date: trialEndDate.toISOString(),
          metadata: {
            trial_started: new Date().toISOString(),
            paystack_reference: paystackResponse.data?.reference,
            renewal_count: 0
          }
        }
      ])
      .select();

    if (createError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create subscription record',
        error: createError.message 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription initialized with 14-day trial',
      data: {
        subscription: subscription[0],
        paystackResponse: paystackResponse.data
      }
    });
  } catch (error) {
    console.error('Initialize subscription error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
}

// Get user's subscriptions
async function getUserSubscriptions(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch subscriptions',
        error: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
}

// Cancel subscription
async function cancelSubscriptionHandler(req, res) {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'subscriptionId is required' 
      });
    }

    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }

    // If subscription is not in trial, notify Paystack
    if (subscription.status !== 'trial' && subscription.plan_code) {
      try {
        // Get subscription code from Paystack (using plan_code as reference)
        const paystackResponse = await fetchSubscription(subscription.plan_code);
        if (paystackResponse.status && paystackResponse.data) {
          // Cancel on Paystack side
          await cancelSubscription(paystackResponse.data.subscription_code, 'NONE');
        }
      } catch (paystackError) {
        console.error('Paystack cancellation error:', paystackError);
        // Continue with local cancellation even if Paystack fails
      }
    }

    // Update subscription status in database
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString(),
        metadata: {
          ...subscription.metadata,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'User requested'
        }
      })
      .eq('id', subscriptionId)
      .select();

    if (updateError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to cancel subscription',
        error: updateError.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: updatedSub[0]
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
}

// Upgrade/Downgrade subscription
async function upgradeSubscription(req, res) {
  try {
    const { subscriptionId } = req.params;
    const { newPlan, newPlanCode } = req.body;

    if (!subscriptionId || !newPlan || !newPlanCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: newPlan, newPlanCode' 
      });
    }

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot upgrade a cancelled subscription' 
      });
    }

    // Update in database
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan: newPlan,
        plan_code: newPlanCode,
        metadata: {
          ...subscription.metadata,
          last_upgrade: new Date().toISOString(),
          previous_plan: subscription.plan
        }
      })
      .eq('id', subscriptionId)
      .select();

    if (updateError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upgrade subscription',
        error: updateError.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: updatedSub[0]
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
}

module.exports = {
  initializeSubscription,
  getUserSubscriptions,
  cancelSubscriptionHandler,
  upgradeSubscription
};
