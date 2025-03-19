// const request = require('supertest');
// const app = require('../app');

// describe('Health Check API Tests', () => {
//     test('Should return 200 for GET /healthz', async () => {
//         const res = await request(app).get('/healthz');
//         expect(res.statusCode).toBe(200);
//     });

//     test('Should return 405 for POST /healthz', async () => {
//         const res = await request(app).post('/healthz').send({});
//         expect(res.statusCode).toBe(405);
//     });

//     test('Should return 400 for invalid URL', async () => {
//         const res = await request(app).get('/invalid');
//         expect(res.statusCode).toBe(400);
//     });

//     test('Should return 400 for Content-Length header set', async () => {
//         const res = await request(app).get('/healthz').set('Content-Length', '100');
//         expect(res.statusCode).toBe(400);
//     });

//     test('Should return 503 if DB is unavailable', async () => {
//         const sequelize = app.get('sequelize');
//         await sequelize.close();
//         const res = await request(app).get('/healthz');
//         expect(res.statusCode).toBe(503);
//     });

//     test('Should return 405 for PUT /healthz', async () => {
//         const res = await request(app).put('/healthz').send({});
//         expect(res.statusCode).toBe(405);
//     });

//     test('Should return 405 for HEAD /healthz', async () => {
//         const res = await request(app).head('/healthz');
//         expect(res.statusCode).toBe(405);
//     });

//     test('Should return 405 for OPTIONS /healthz', async () => {
//         const res = await request(app).options('/healthz');
//         expect(res.statusCode).toBe(405);
//     });

//     test('Should return 400 for invalid JSON payload', async () => {
//         const res = await request(app)
//             .post('/healthz')
//             .set('Content-Type', 'application/json')
//             .send('invalid-json');
//         expect(res.statusCode).toBe(400);
//     });


//     test('Should return 405 for PATCH /healthz', async () => {
//         const res = await request(app).patch('/healthz').send({});
//         expect(res.statusCode).toBe(405);
//     });

//     afterAll(async () => {
//         const sequelize = app.get('sequelize');
//         if (sequelize) {
//             await sequelize.close();
//         }
//     });
// });

const request = require('supertest');
const app = require('../app');
const { Sequelize, DataTypes } = require('sequelize');

// Mock AWS SDK to prevent real S3 uploads during tests
jest.mock('aws-sdk', () => {
    const mockS3Instance = {
        upload: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({ Location: "https://test-bucket.s3.amazonaws.com/testfile.jpg" }),
        }),
        deleteObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({}),
        }),
    };

    return {
        S3: jest.fn(() => mockS3Instance),
    };
});

// Initialize a test database (in-memory SQLite for tests)
const sequelize = new Sequelize('sqlite::memory:', { logging: false });
const File = sequelize.define('File', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fileName: { type: DataTypes.STRING, allowNull: false },
    s3Url: { type: DataTypes.STRING, allowNull: false },
}, {
    timestamps: true,
    tableName: 'files'
});

describe('API Tests - Health Check & File Management', () => {
    beforeAll(async () => {
        await sequelize.sync();
        app.set('sequelize', sequelize);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    // 🔹 Health Check Tests
    describe('Health Check API', () => {
        test('Should return 200 for GET /healthz when DB is available', async () => {
            const res = await request(app).get('/healthz');
            expect(res.statusCode).toBe(200);
        });

        test('Should return 503 for GET /healthz if DB is unavailable', async () => {
            await sequelize.close(); // Simulate DB failure
            const res = await request(app).get('/healthz');
            expect(res.statusCode).toBe(503);
        });

        test('Should return 405 for POST /healthz', async () => {
            const res = await request(app).post('/healthz').send({});
            expect(res.statusCode).toBe(405);
        });

        test('Should return 400 for invalid URL', async () => {
            const res = await request(app).get('/invalid');
            expect(res.statusCode).toBe(400);
        });

        test('Should return 400 for Content-Length header set', async () => {
            const res = await request(app).get('/healthz').set('Content-Length', '100');
            expect(res.statusCode).toBe(400);
        });

        test('Should return 405 for unsupported methods on /healthz', async () => {
            const unsupportedMethods = ['put', 'head', 'options', 'patch'];
            for (const method of unsupportedMethods) {
                const res = await request(app)[method]('/healthz').send({});
                expect(res.statusCode).toBe(405);
            }
        });
    });

    // 🔹 File Management Tests
    describe('File Upload and Management', () => {
        test('Should upload a file successfully', async () => {
            const res = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test file content'), { filename: 'testfile.jpg', contentType: 'image/jpeg' });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('fileName', 'testfile.jpg');
            expect(res.body).toHaveProperty('s3Url');
        });

        test('Should return 400 if no file is uploaded', async () => {
            const res = await request(app).post('/upload');
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'No file uploaded. Please attach a file.');
        });

        test('Should return a list of uploaded files', async () => {
            const res = await request(app).get('/files');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('Should return 404 if no files exist', async () => {
            await File.destroy({ where: {} }); // Clear the database
            const res = await request(app).get('/files');
            expect(res.statusCode).toBe(404);
        });

        test('Should delete a file successfully', async () => {
            const file = await File.create({ fileName: 'testfile.jpg', s3Url: 'https://test-bucket.s3.amazonaws.com/testfile.jpg' });

            const res = await request(app).delete(`/files/${file.id}`);
            expect(res.statusCode).toBe(204);
        });

        test('Should return 404 if deleting a non-existent file', async () => {
            const res = await request(app).delete('/files/9999');
            expect(res.statusCode).toBe(404);
        });
    });
});
