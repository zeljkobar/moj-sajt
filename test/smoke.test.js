const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const app = require('../app');
const pageRoutes = require('../src/routes/pageRoutes');
const marketingRoutes = require('../src/routes/marketingRoutes');
const { detectDomain } = require('../src/config/domains');
const { authMiddleware } = require('../src/middleware/auth');
const { pool } = require('../src/config/database');

function routePaths(router) {
  return router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
    }));
}

test.after(async () => {
  await pool.end();
});

test('detects domain-specific site configuration', () => {
  assert.equal(detectDomain({ host: 'mojradnik.me' }).type, 'mojradnik');
  assert.equal(
    detectDomain({ host: 'www.prijaviradnika.com' }).type,
    'prijaviradnika'
  );
  assert.equal(
    detectDomain({ host: 'localhost:3000', queryDomain: 'mojradnik' }).type,
    'mojradnik'
  );
  assert.equal(detectDomain({ host: 'unknown.example' }).type, 'summasummarum');
});

test('registers core page routes in the page router', () => {
  const paths = routePaths(pageRoutes).map(route => route.path);

  assert.ok(paths.includes('/'));
  assert.ok(paths.includes('/dashboard.html'));
  assert.ok(paths.includes('/prijava.html'));
  assert.ok(paths.includes('/dobit_prijava/index.html'));
});

test('registers marketing and email-admin routes in the marketing router', () => {
  const routes = routePaths(marketingRoutes);

  assert.ok(
    routes.some(
      route =>
        route.path === '/api/marketing/test' && route.methods.includes('post')
    )
  );
  assert.ok(
    routes.some(
      route =>
        route.path === '/api/marketing/campaigns' &&
        route.methods.includes('get')
    )
  );
  assert.ok(
    routes.some(
      route =>
        route.path === '/api/email-admin/stats' && route.methods.includes('get')
    )
  );
});

test('main app exports Express app without starting a server', () => {
  assert.equal(typeof app, 'function');
  assert.ok(app.router);
  assert.ok(app.router.stack.length > 0);
});

test('auth middleware returns JSON 401 for unauthenticated API requests', () => {
  const req = {
    path: '/api/firme',
    headers: { accept: 'application/json' },
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  authMiddleware(req, res, () => {
    throw new Error('next should not be called');
  });

  assert.equal(res.statusCode, 401);
  assert.match(res.body.msg, /autentifikovan/i);
});
