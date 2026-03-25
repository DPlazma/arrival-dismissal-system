const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

function request(method, path, body, cookies) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: {}
        };
        if (body) {
            const payload = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }
        if (cookies) {
            options.headers['Cookie'] = cookies;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json;
                try { json = JSON.parse(data); } catch { json = data; }
                resolve({ status: res.statusCode, body: json, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function extractCookies(headers) {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return '';
    return setCookies.map(c => c.split(';')[0]).join('; ');
}

describe('Health & Public Endpoints', () => {
    it('GET /health returns healthy', async () => {
        const res = await request('GET', '/health');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, 'healthy');
        assert.ok(res.body.totalVehicles >= 0);
    });

    it('GET /api/vehicles returns array', async () => {
        const res = await request('GET', '/api/vehicles');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body));
    });

    it('GET /api/vehicles/buses returns only buses', async () => {
        const res = await request('GET', '/api/vehicles/buses');
        assert.strictEqual(res.status, 200);
        res.body.forEach(v => assert.strictEqual(v.type, 'bus'));
    });

    it('GET /api/vehicles/taxis returns only taxis/parents', async () => {
        const res = await request('GET', '/api/vehicles/taxis');
        assert.strictEqual(res.status, 200);
        res.body.forEach(v => assert.ok(['taxi', 'parent'].includes(v.type)));
    });

    it('GET /api/students returns array', async () => {
        const res = await request('GET', '/api/students');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body));
    });

    it('GET /api/ui-settings returns settings without auth', async () => {
        const res = await request('GET', '/api/ui-settings');
        assert.strictEqual(res.status, 200);
        assert.ok('theme' in res.body);
        assert.ok('schoolName' in res.body);
        assert.ok('pathwayLabel' in res.body);
    });

    it('GET /api/stats returns vehicle and student counts', async () => {
        const res = await request('GET', '/api/stats');
        assert.strictEqual(res.status, 200);
        assert.ok('vehicles' in res.body);
        assert.ok('students' in res.body);
    });

    it('GET /api/events returns text/event-stream', async () => {
        const url = new URL('/api/events', BASE_URL);
        const res = await new Promise((resolve) => {
            const req = http.get(url, (res) => {
                assert.ok(res.headers['content-type'].includes('text/event-stream'));
                resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
                req.destroy();
            });
        });
        assert.strictEqual(res.status, 200);
    });
});

describe('Authentication', () => {
    it('POST /api/verify-pin rejects empty PIN', async () => {
        const res = await request('POST', '/api/verify-pin', {});
        assert.strictEqual(res.status, 400);
    });

    it('POST /api/verify-pin rejects wrong PIN', async () => {
        const res = await request('POST', '/api/verify-pin', { pin: '0000' });
        assert.ok([401, 429].includes(res.status)); // 429 if rate limited
    });

    it('Mutation routes reject unauthenticated requests', async () => {
        const res1 = await request('POST', '/api/vehicles/1/toggle');
        assert.strictEqual(res1.status, 401);

        const res2 = await request('POST', '/api/reset');
        assert.strictEqual(res2.status, 401);

        const res3 = await request('PUT', '/api/ui-settings', { theme: 'green' });
        assert.strictEqual(res3.status, 401);

        const res4 = await request('POST', '/api/students', { name: 'Test', transport: 'Bus', class: '3A' });
        assert.strictEqual(res4.status, 401);
    });
});

describe('Authenticated Operations', () => {
    let cookies = '';

    before(async () => {
        const res = await request('POST', '/api/verify-pin', { pin: '1234' });
        if (res.status === 200) {
            cookies = extractCookies(res.headers);
        }
    });

    it('POST /api/vehicles/:id/toggle changes status', async () => {
        if (!cookies) return; // Skip if auth failed (PIN not set to 1234)
        const vehicles = (await request('GET', '/api/vehicles')).body;
        if (vehicles.length === 0) return;

        const id = vehicles[0].id;
        const before = vehicles[0].status;
        const res = await request('POST', `/api/vehicles/${id}/toggle`, null, cookies);
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.vehicle.status !== before || res.body.vehicle.type === 'taxi');
    });

    it('PUT /api/ui-settings updates theme', async () => {
        if (!cookies) return;
        const res = await request('PUT', '/api/ui-settings', { theme: 'purple' }, cookies);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.settings.theme, 'purple');

        // Reset
        await request('PUT', '/api/ui-settings', { theme: 'blue' }, cookies);
    });

    it('PUT /api/ui-settings rejects invalid theme', async () => {
        if (!cookies) return;
        const res = await request('PUT', '/api/ui-settings', { theme: 'evil' }, cookies);
        assert.strictEqual(res.status, 400);
    });

    it('POST /api/reset/afternoon works', async () => {
        if (!cookies) return;
        const res = await request('POST', '/api/reset/afternoon', null, cookies);
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
    });
});
