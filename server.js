const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const questionRoutes = require('./routes/questionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const parseRoute = require('./routes/upload');
const { initializeTransaction } = require('./paystack');
const crypto = require('crypto');
const axios = require('axios');

// Load config
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json()); // Allows us to accept JSON data in body
app.use(cors()); // Allows frontend to communicate with backend


// Routes
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/parse', parseRoute);
app.post('/api/pay', async (req, res) => {
  try {
    const { email, amount } = req.body;

    const response = await initializeTransaction({ email, amount });

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
})

// app.post("/api/webhook/url", function (req, res) {
//   const hash = crypto
//     .createHmac('sha512', process.env.SECRET_KEY)
//     .update(JSON.stringify(req.body))
//     .digest('hex');

//   if (hash === req.headers['x-paystack-signature']) {
//     const event = req.body;
//     console.log('event', event);

//     // handle events here
//     if (event.event === 'charge.success') {
//       console.log('Payment successful!');
//     }
//   }

//   res.sendStatus(200);
// });

app.post("/api/webhook/url", async function (req, res) {

  const hash = crypto
    .createHmac('sha512', process.env.SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash === req.headers['x-paystack-signature']) {

    const event = req.body;
    console.log('event', event)

    if (event.event === 'charge.success') {

      const reference = event.data.reference;
      console.log('reference', reference);
      try {

        // VERIFY PAYMENT
        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.SECRET_KEY}`,
            },
          }
        );
        console.log("response", response);

        const paymentData = response.data.data;

        // CONFIRM PAYMENT REALLY SUCCEEDED
        if (paymentData.status === 'success') {

          // VERY IMPORTANT:
          // Check database so you don't process twice

          console.log('Verified payment success');

          // Give user value here
          // e.g wallet funding, exam access, etc

        }

      } catch (error) {
        console.log(error.message);
      }
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));