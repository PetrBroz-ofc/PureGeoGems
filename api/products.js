import formidable from 'formidable';
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Ověř token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Neautorizováno' });
  }

  try {
    if (req.method === 'GET') {
      const snap = await db.collection('products').orderBy('name').get();
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
  // Zpracujeme FormData
  const form = formidable({});
  
  const [fields, files] = await form.parse(req);
  
  // Z fields dostaneme textová data
  const productData = {
    name: fields.name?.[0] || '',
    price: parseFloat(fields.price?.[0] || 0),
    category: fields.category?.[0] || '',
    material: fields.material?.[0] || '',
    description: fields.description?.[0] || '',
    badge: fields.badge?.[0] || '',
    inStock: fields.inStock?.[0] === 'true',
    createdAt: new Date().toISOString()
  };
  
  // Zatím dáme placeholder obrázek
  productData.imageUrl = 'https://via.placeholder.com/300';
  
  // Uložíme do Firestore
  const ref = await db.collection('products').add(productData);
  
  return res.status(200).json({ 
    id: ref.id,
    message: 'Produkt uložen (bez fotky - připravujeme Cloudinary)'
  });
}

    if (req.method === 'PUT') {
      const { id, ...data } = req.body;
      data.updatedAt = new Date().toISOString();
      await db.collection('products').doc(id).update(data);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await db.collection('products').doc(id).delete();
      return res.status(200).json({ ok: true });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
