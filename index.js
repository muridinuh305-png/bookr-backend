const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");

const app = express();

// Use raw body for webhooks
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Webhook error:", err.message);
    return res.status(400).send("Webhook error");
  }

  const data = event.data.object;

  if (event.type === "payment_intent.succeeded") {
    console.log("Payment successful:", data.id);
  }

  if (event.type === "account.updated") {
    console.log("Connected account updated:", data.id);
  }

  res.json({ received: true });
});

// Normal API JSON routes
app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ CUSTOMER MAKES PAYMENT
app.post("/create-payment", async (req, res) => {
  const { amount, barberStripeId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      application_fee_amount: Math.round(amount * 0.1), // your % cut
      transfer_data: {
        destination: barberStripeId
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ BARBER CONNECT STRIPE
app.get("/connect-stripe", async (req, res) => {
  const account = await stripe.accounts.create({ type: "express" });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "https://yourapp.com/reauth",
    return_url: "https://yourapp.com/success",
    type: "account_onboarding"
  });

  res.json({ url: accountLink.url, stripeId: account.id });
});

// ✅ SUBSCRIPTIONS
app.post("/subscribe-barber", async (req, res) => {
  const { customerId } = req.body;

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.SUBSCRIPTION_PRICE_ID }],
    trial_period_days: 30
  });

  res.json(sub);
});

app.listen(process.env.PORT || 4242, () => {
  console.log("Backend running");
});
