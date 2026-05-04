
import express from 'express';
import path from 'path';
import cors from 'cors';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize Firebase Admin
import fs from 'fs';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function getNextId(counterPath: string, startFrom: number) {
  try {
    const counterRef = db.collection('metadata').doc('counters');
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      let count = startFrom;
      
      if (!doc.exists) {
        t.set(counterRef, { [counterPath]: startFrom + 1 });
      } else {
        const data = doc.data();
        count = data && data[counterPath] ? data[counterPath] : startFrom;
        t.update(counterRef, { [counterPath]: count + 1 });
      }
      return count;
    });
    return result;
  } catch (error) {
    console.error(`Error generating ID for ${counterPath}:`, error);
    return Math.floor(Math.random() * 1000); // Fallback
  }
}

async function startServer() {
  // API Routes
  app.post('/api/webhook/lead', async (req, res) => {
    try {
      // Simple API Key Security
      const apiKey = req.headers['x-api-key'];
      const expectedKey = process.env.SYNC_API_KEY || 'crm_sync_default_key_123';
      
      if (apiKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      }

      const { 
        name, 
        phone, 
        source = 'Excel Sync', 
        address = '', 
        city = '', 
        pincode = '', 
        product = '',
        package: leadPackage = '',
        price = 0,
        method = 'COD'
      } = req.body;
      
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
      }

      // Generate Sequential IDs
      const nextSerial = await getNextId('leads', 1);
      const serialId = nextSerial < 10 ? `0${nextSerial}` : `${nextSerial}`;
      
      const leadData = {
        serialId,
        customerName: name, // Using standard field names
        name,
        phone,
        value: Number(price) || 0,
        source,
        address,
        city,
        pincode,
        product: product || leadPackage || 'Auto-Imported',
        status: 'New Lead',
        paymentMode: method || 'COD',
        assignedTo: 'Unassigned',
        assignedToId: '',
        package: leadPackage || product || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{
          id: Math.random().toString(36).substring(2, 9),
          type: 'other',
          updatedBy: 'Excel Sync',
          updatedById: 'api',
          timestamp: new Date().toISOString(),
          note: 'Lead automatically synced from Excel/Sheet'
        }]
      };

      const docRef = await db.collection('leads').add(leadData);
      
      console.log('Lead Saved:', docRef.id);
      
      res.status(201).json({ 
        success: true, 
        message: 'Lead received and saved successfully!',
        leadId: docRef.id,
        value: leadData.value
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
      console.error('Webhook Error:', errorMessage);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: errorMessage 
      });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
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
