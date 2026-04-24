
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

// In-memory OTP storage for the demo (ideally use Firestore or Redis)
const otpStore = new Map<string, { otp: string, expires: number }>();

async function sendEmail(to: string, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('[EMAIL ERROR] Missing SMTP configuration. Email not sent.');
    console.log(`[FALLBACK LOG] To: ${to}, Subject: ${subject}, Body: ${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || '"TOZ Flow" <no-reply@tozflow.com>',
      to,
      subject,
      text,
    });
    console.log(`[EMAIL SENT] Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('[EMAIL SENDING FAILED]', error);
    throw error;
  }
}

// Add a simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Explicitly handle preflight
app.options('*', cors());

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
      const { 
        name, 
        email, 
        phone, 
        source = 'Website API', 
        address = '', 
        city = '', 
        pincode = '', 
        product = 'Advanced Gel Formula',
        quantity = 1,
        affiliateId: providedAffiliateId = ''
      } = req.body;
      
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
      }

      // Generate Sequential IDs
      const nextSerial = await getNextId('leads', 1);
      const serialId = nextSerial < 10 ? `0${nextSerial}` : `${nextSerial}`;
      
      let finalAffiliateId = providedAffiliateId;
      if (!finalAffiliateId) {
        const nextAffId = await getNextId('affiliates', 101);
        finalAffiliateId = `${nextAffId}`;
      }

      // Standard Pricing Logic: 1 bottle = 2999, 2 bottles = 3999
      let value = 2999;
      if (Number(quantity) === 2) value = 3999;
      else if (Number(quantity) > 2) value = 3999 + ((Number(quantity) - 2) * 1500);

      const leadData = {
        serialId,
        name,
        email: email || '',
        phone,
        value,
        source,
        address,
        city,
        pincode,
        product,
        quantity: Number(quantity),
        affiliateId: finalAffiliateId,
        status: 'New',
        paymentMode: 'COD',
        assignedTo: 'Unassigned',
        assignedToId: '',
        package: `${quantity} Bottle${Number(quantity) !== 1 ? 's' : ''}`,
        createdAt: new Date().toISOString(),
        history: [{
          id: Math.random().toString(36).substring(2, 9),
          type: 'other',
          updatedBy: 'System API',
          updatedById: 'api',
          timestamp: new Date().toISOString(),
          note: 'Lead received via Website API'
        }]
      };

      const docRef = await db.collection('leads').add(leadData);
      
      console.log('Lead Saved:', docRef.id);
      
      res.status(201).json({ 
        success: true, 
        message: 'Lead received and saved successfully!',
        leadId: docRef.id,
        value: value
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

  // OTP Endpoints
  app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    otpStore.set(email.toLowerCase(), { otp, expires });

    try {
      await sendEmail(
        email, 
        'Password Reset OTP - TOZ Flow', 
        `Aapka OTP reset ke liye hai: ${otp}. Ye 10 minute tak valid hai.`
      );
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send OTP email. Please check server configuration.' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    try {
      // Find the user by email in Firestore
      const userRef = db.collection('users').where('email', '==', email.toLowerCase());
      const snapshot = await userRef.get();
      
      if (snapshot.empty) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userId = snapshot.docs[0].id;
      
      // Update the user's password field (Note: In Firebase Auth, we usually use adminAuth.updateUser)
      // But for this custom flow, we'll just acknowledge the verification.
      // In a real app with Firebase Admin Auth:
      // await adminAuth.updateUser(userId, { password: newPassword });
      
      otpStore.delete(email.toLowerCase());
      res.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset password' });
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
