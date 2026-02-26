const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Povol CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, shippingPrice, codFee, customerEmail } = req.body;

    // Sestav line items z košíku
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'czk',
        product_data: { name: item.name },
        unit_amount: item.price * 100, // Stripe chce haléře
      },
      quantity: item.qty,
    }));

    // Přidej dopravu pokud není zdarma
    if (shippingPrice > 0) {
      lineItems.push({
        price_data: {
          currency: 'czk',
          product_data: { name: 'Doprava' },
          unit_amount: shippingPrice * 100,
        },
        quantity: 1,
      });
    }

    // Přidej dobírku pokud je zvolena
    if (codFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'czk',
          product_data: { name: 'Dobírka' },
          unit_amount: codFee * 100,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: 'https://pure-geo-gems.vercel.app/?order=success',
      cancel_url: 'https://pure-geo-gems.vercel.app/?order=cancel',
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}
