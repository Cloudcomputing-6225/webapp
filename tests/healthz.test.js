import request from 'supertest';

let app, sequelize;
beforeAll(async () => {
    const module = await import('../app.js');
    app = module.app;
    sequelize = module.sequelize;
});

describe('Health Check API Tests', () => {
    test('Should return 200 for GET /healthz', async () => {
        const res = await request(app).get('/healthz');
        expect(res.statusCode).toBe(200);
    });

    test('Should return 405 for POST /healthz', async () => {
        const res = await request(app).post('/healthz').send({});
        expect(res.statusCode).toBe(405);
    });

    test('Should return 405 for PUT /healthz', async () => {
        const res = await request(app).put('/healthz').send({});
        expect(res.statusCode).toBe(405);
    });

    test('Should return 405 for PATCH /healthz', async () => {
        const res = await request(app).patch('/healthz').send({});
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

    test('Should return 503 if DB is unavailable', async () => {
        await sequelize.close(); // Close DB connection

        // Try health check after DB is closed
        const res = await request(app).get('/healthz');
        expect(res.statusCode).toBe(503);

        // Reconnect the DB after test
        app.sequelize = new (await import('sequelize')).Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            logging: false,
        });

        await app.sequelize.authenticate(); // Reconnect DB
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
        }
    });
});

