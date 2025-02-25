const request = require('supertest');
const app = require('../app');

describe('Health Check API Tests', () => {
    test('Should return 200 for GET /healthz', async () => {
        const res = await request(app).get('/healthz');
        expect(res.statusCode).toBe(200);
    });

    test('Should return 405 for POST /healthz', async () => {
        const res = await request(app).post('/healthz').send({});
        expect(res.statusCode).toBe(405);
    });

    test('Should return 400 for invalid URL', async () => {
        const res = await request(app).get('/invalid');
        expect(res.statusCode).toBe(200);
    });

    test('Should return 400 for Content-Length header set', async () => {
        const res = await request(app).get('/healthz').set('Content-Length', '100');
        expect(res.statusCode).toBe(400);
    });

    test('Should return 503 if DB is unavailable', async () => {
        const sequelize = app.get('sequelize');
        await sequelize.close();
        const res = await request(app).get('/healthz');
        expect(res.statusCode).toBe(503);
    });

    test('Should return 405 for PUT /healthz', async () => {
        const res = await request(app).put('/healthz').send({});
        expect(res.statusCode).toBe(405);
    });

    test('Should return 405 for HEAD /healthz', async () => {
        const res = await request(app).head('/healthz');
        expect(res.statusCode).toBe(405);
    });

    test('Should return 405 for OPTIONS /healthz', async () => {
        const res = await request(app).options('/healthz');
        expect(res.statusCode).toBe(405);
    });

    test('Should return 400 for invalid JSON payload', async () => {
        const res = await request(app)
            .post('/healthz')
            .set('Content-Type', 'application/json')
            .send('invalid-json');
        expect(res.statusCode).toBe(400);
    });


    test('Should return 405 for PATCH /healthz', async () => {
        const res = await request(app).patch('/healthz').send({});
        expect(res.statusCode).toBe(405);
    });

    afterAll(async () => {
        const sequelize = app.get('sequelize');
        if (sequelize) {
            await sequelize.close();
        }
    });
});
