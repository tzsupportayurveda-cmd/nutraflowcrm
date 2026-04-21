
import express from 'express';
import path from 'path';
import cors from 'cors';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// Note: In AI Studio, we often use the client config for simplicity if service account is not available
// but for a real integration, a service account is recommended.
// For now, we assume the environment might have what's needed or we use a fallback.
// We'll use the firestore collection directly if we can.

async function startServer() {
  // API Routes
  app.post('/api/webhook/lead', async (req, res) => {
    try {
      const { name, email, phone, value, source, address, city, pincode, package: selectedPackage } = req.body;
      
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
      }

      console.log('Received Lead:', { name, email, phone, value, source, address, city, pincode, selectedPackage });
      
      // In a real setup with service account:
      // const db = getFirestore();
      // await db.collection('leads').add({ name, email, phone, value, source, createdAt: new Date().toISOString(), status: 'New' });

      res.status(201).json({ message: 'Lead received successfully! (Simulation)' });
    } catch (error) {
      console.error('Webhook Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
