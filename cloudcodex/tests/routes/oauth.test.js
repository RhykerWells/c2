import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { c2_query } from '../../mysql_connect.js';
import { mockAuthenticated, mockUnauthenticated, resetMocks, TEST_USER } from '../helpers.js';

describe('OAuth Routes', () => {
  beforeEach(() => {
    resetMocks();
  });

  // --- GET /api/oauth/providers ---

  describe('GET /api/oauth/providers', () => {
    it('returns provider availability', async () => {
      const res = await request(app).get('/api/oauth/providers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.providers).toBeDefined();
      expect(typeof res.body.providers.google).toBe('boolean');
    });
  });

  // --- GET /api/oauth/status ---

  describe('GET /api/oauth/status', () => {
    it('returns linked accounts for authenticated user', async () => {
      mockAuthenticated();
      c2_query.mockResolvedValueOnce([
        { provider: 'google', provider_email: 'user@google.com', created_at: '2026-01-01' },
      ]);
      c2_query.mockResolvedValueOnce([{ password_hash: 'hashed' }]);

      const res = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accounts).toHaveLength(1);
      expect(res.body.accounts[0].provider).toBe('google');
      expect(res.body.hasPassword).toBe(true);
    });

    it('returns hasPassword false when no password set', async () => {
      mockAuthenticated();
      c2_query.mockResolvedValueOnce([]);
      c2_query.mockResolvedValueOnce([{ password_hash: null }]);

      const res = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.hasPassword).toBe(false);
    });

    it('requires authentication', async () => {
      mockUnauthenticated();
      const res = await request(app).get('/api/oauth/status');
      expect(res.status).toBe(401);
    });
  });

  // --- POST /api/oauth/google/unlink ---

  describe('POST /api/oauth/google/unlink', () => {
    it('unlinks Google account when user has password', async () => {
      mockAuthenticated();
      c2_query.mockResolvedValueOnce([{ password_hash: 'hashed' }]); // has password
      c2_query.mockResolvedValueOnce({ affectedRows: 1 }); // delete oauth

      const res = await request(app)
        .post('/api/oauth/google/unlink')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects when user has no password', async () => {
      mockAuthenticated();
      c2_query.mockResolvedValueOnce([{ password_hash: null }]); // no password

      const res = await request(app)
        .post('/api/oauth/google/unlink')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/must set a password/);
    });

    it('requires authentication', async () => {
      mockUnauthenticated();
      const res = await request(app).post('/api/oauth/google/unlink');
      expect(res.status).toBe(401);
    });
  });
});
