const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const connectDB = require('./config/db');
const questionRoutes = require('./routes/questionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const parseRoute = require('./routes/upload');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { initializeTransaction } = require('./paystack');
const { supabase } = require('./supabase/supabaseClient');

// Load config
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json()); 
app.use(cors());

// Routes
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/parse', parseRoute);
app.use('/api/subscriptions', subscriptionRoutes);

// 1. Initialize Payment Route
app.post('/api/pay', async (req, res) => {
    try {
        const { email, amount } = req.body;
        // Ensure initializeTransaction is correctly exported from your paystack.js
        const response = await initializeTransaction({ email, amount });
        res.json(response);
    } catch (error) {
        console.error('Payment Init Error:', error.message);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

// 2. Helper function to verify payment via Paystack API
const verifyPayment = async (reference) => {
    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.SECRET_KEY}`, // Ensure this is in your .env
            },
        }
    );
    return response.data.data;
};

// 3. Enhanced Webhook Route for Payments & Subscriptions
app.post('/api/webhook/url', async (req, res) => {
    try {
        // VERIFY SIGNATURE
        const hash = crypto
            .createHmac('sha512', process.env.SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature',
            });
        }

        const event = req.body;
        console.log('Webhook Event Received:', event.event);

        // Handle subscription.create event
        if (event.event === 'subscription.create') {
            try {
                const { data } = event;
                const { customer, subscription } = data;

                // Update subscription status to active
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        authorization_code: data.authorization?.authorization_code,
                        metadata: {
                            paystack_subscription_code: subscription?.subscription_code,
                            subscription_created_at: data.created_at
                        }
                    })
                    .eq('customer_email', customer?.email)
                    .eq('status', 'trial');

                console.log(`Subscription created for ${customer?.email}`);
                return res.status(200).send('Subscription created webhook processed');
            } catch (error) {
                console.error('subscription.create handler error:', error);
            }
        }

        // Handle invoice.create event (upcoming charge notification)
        if (event.event === 'invoice.create') {
            try {
                const { data } = event;
                console.log(`Invoice created: ${data.invoice_code} for ${data.customer?.email}`);

                // Update metadata with next payment info
                await supabase
                    .from('subscriptions')
                    .update({
                        metadata: {
                            next_payment_date: data.subscription?.next_payment_date,
                            invoice_code: data.invoice_code
                        }
                    })
                    .eq('customer_email', data.customer?.email)
                    .eq('status', 'active');

                return res.status(200).send('Invoice created webhook processed');
            } catch (error) {
                console.error('invoice.create handler error:', error);
            }
        }

        // Handle successful charges (both one-time and subscription)
        if (event.event === 'charge.success') {
            try {
                const reference = event.data.reference;
                console.log('Charge successful for reference:', reference);

                // Verify with Paystack API
                const paymentData = await verifyPayment(reference);
                if (paymentData.status === 'success') {
                    console.log('Payment verified for:', reference);

                    // If it's a subscription charge
                    if (paymentData.subscription) {
                        await supabase
                            .from('subscriptions')
                            .update({
                                status: 'active',
                                metadata: {
                                    last_charge_date: new Date().toISOString(),
                                    last_charge_reference: reference,
                                    last_charge_amount: paymentData.amount
                                }
                            })
                            .eq('customer_email', paymentData.customer?.email)
                            .eq('status', 'active');
                    }

                    return res.status(200).send('Webhook Processed');
                }
            } catch (error) {
                console.error('charge.success handler error:', error);
            }
        }

        // Handle subscription.disable event (cancellation/completion)
        if (event.event === 'subscription.disable') {
            try {
                const { data } = event;
                const { subscription, customer } = data;

                // Update subscription status to cancelled/completed
                const newStatus = data.status === 'complete' ? 'completed' : 'cancelled';
                await supabase
                    .from('subscriptions')
                    .update({
                        status: newStatus,
                        end_date: new Date().toISOString(),
                        metadata: {
                            paystack_final_status: data.status,
                            disabled_at: data.created_at
                        }
                    })
                    .eq('customer_email', customer?.email);

                console.log(`Subscription disabled for ${customer?.email}`);
                return res.status(200).send('Subscription disabled webhook processed');
            } catch (error) {
                console.error('subscription.disable handler error:', error);
            }
        }

        // Handle subscription.not_renew event (won't renew on next date)
        if (event.event === 'subscription.not_renew') {
            try {
                const { data } = event;
                const { subscription, customer } = data;

                // Update to non-renewing status
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'non_renewing',
                        metadata: {
                            not_renew_date: new Date().toISOString()
                        }
                    })
                    .eq('customer_email', customer?.email);

                console.log(`Subscription marked non-renewing for ${customer?.email}`);
                return res.status(200).send('Subscription non-renew webhook processed');
            } catch (error) {
                console.error('subscription.not_renew handler error:', error);
            }
        }

        // Handle invoice.payment_failed event
        if (event.event === 'invoice.payment_failed') {
            try {
                const { data } = event;
                console.log(`Invoice payment failed: ${data.invoice_code} for ${data.customer?.email}`);

                // Update subscription to attention status
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'attention',
                        metadata: {
                            failed_invoice_code: data.invoice_code,
                            failure_reason: data.description,
                            failed_at: new Date().toISOString()
                        }
                    })
                    .eq('customer_email', data.customer?.email);

                return res.status(200).send('Invoice payment failed webhook processed');
            } catch (error) {
                console.error('invoice.payment_failed handler error:', error);
            }
        }

        // Handle subscription.expiring_cards event
        if (event.event === 'subscription.expiring_cards') {
            try {
                const { data } = event;
                console.log(`Expiring cards alert received for ${data.length} subscription(s)`);

                // For each expiring card, update metadata
                for (const cardData of data) {
                    await supabase
                        .from('subscriptions')
                        .update({
                            metadata: {
                                expiring_card: cardData.description,
                                card_expiry_date: cardData.expiry_date,
                                expiring_card_alert_date: new Date().toISOString()
                            }
                        })
                        .eq('customer_email', cardData.customer?.email)
                        .eq('status', 'active');
                }

                return res.status(200).send('Expiring cards webhook processed');
            } catch (error) {
                console.error('subscription.expiring_cards handler error:', error);
            }
        }

        // Return 200 to Paystack to stop retries even if it's an event you don't handle
        res.status(200).send('Event ignored');

    } catch (error) {
        console.error('Webhook Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));