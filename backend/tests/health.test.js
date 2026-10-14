const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
  test('returns 200 with status healthy and metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
    expect(['connected', 'fallback_mode']).toContain(res.body.database);
  });
});
