/**
 * Main Express API for Cloud Codex
 * 
 * All Rights Reserved to Cloud City Computing, LLC 2026
 * https://cloudcitycomputing.com
 */

import ViteExpress from 'vite-express';
import { verifyEmailConnection } from './services/email.js';
import { setupCollabServer } from './services/collab.js';
import { ensureAdminUser } from './routes/admin.js';
import { setGlobalSettings } from './routes/helpers/shared.js';
import app from './app.js';

// ─── Require Admin credentials before starting ──────────────
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_EMAIL) {
  console.error('✖ Missing required admin configuration: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL');
  console.error('  Copy .env.example to .env and fill in your admin credentials.');
  process.exit(1);
}

// SMTP configuration check and validation
async function checkSMTPConfiguration() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('✖ SMTP connection failed — check .env credentials. Email features will be disabled.');
    console.error('  Copy .env.example to .env and fill in your SMTP credentials.');
    return false;
  }

  // Verify the SMTP connection
  const emailOk = await verifyEmailConnection();
  if (emailOk) {
    console.log('✔ SMTP connection verified');
  } else {
    console.error('✖ SMTP connection failed — check .env credentials. Email features will be disabled.');
  }

  return emailOk;
}

const server = ViteExpress.listen(app, 3000, async () => {
  console.log('CloudCodex API Server is running on http://localhost:3000');

  // Run SMTP validation before the server starts handling requests
  const emailOk = await checkSMTPConfiguration();

  // Store the global SMTP status in system settings
  await setGlobalSettings({ globalSMTPEnabled: emailOk });

  // Ensure the admin super user exists in the database
  await ensureAdminUser();
});

// Attach WebSocket collaborative editing server to the HTTP server
setupCollabServer(server);
console.log('✔ Collaborative editing WebSocket server attached');
