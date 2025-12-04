const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const app = express();
// ✅ Home route
app.get("/", (req, res) => {
  res.send("✅ Bookr backend is running");
});

// ✅ Health check
app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ Stripe webhook (RAW body required)
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
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
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;

    // ✅ Handle events
    if (event.type === "payment_intent.succeeded") {
      console.log("✅ Payment successful:", data.id);
    }

    if (event.type === "account.updated") {
      console.log("✅ Connected account updated:", data.id);
    }

    res.json({ received: true });
  }
);

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Backend running on port", PORT);
});