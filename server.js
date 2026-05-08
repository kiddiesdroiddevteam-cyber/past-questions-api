const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const connectDB = require('./config/db');
const questionRoutes = require('./routes/questionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const parseRoute = require('./routes/upload');
const { initializeTransaction } = require('./paystack');

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

// 3. Webhook Route
app.post('/api/webhook/url', async (req, res) => {
    try {
        // VERIFY SIGNATURE
        const hash = crypto
            .createHmac('sha512', process.env.SECRET_KEY) // Use your Secret Key
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

        // Only process successful charges
        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            
            // OPTIONAL: Double check with Paystack API
            const paymentData = await verifyPayment(reference);

            if (paymentData.status === 'success') {
                console.log('Payment verified for:', reference);
                
                // TODO: UPDATE YOUR DATABASE HERE
                // Example: await User.findOneAndUpdate({email: paymentData.customer.email}, {plan: 'premium'})

                return res.status(200).send('Webhook Processed');
            }
        }

        // Return 200 to Paystack to stop retries even if it's an event you don't handle
        res.status(200).send('Event ignored');

    } catch (error) {
        console.error('Webhook Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}); // Fixed missing closing bracket here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));