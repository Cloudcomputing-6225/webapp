const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.all('/healthz', (req, res, next) => {
    if (req.method !== 'GET') {
        return res.status(405).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }
    next();
});

app.use((req, res, next) => {
    if (req.header('Content-Length') && parseInt(req.header('Content-Length')) > 0) {
        return res.status(400).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }
    next();
});

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        dialectOptions: { charset: 'utf8mb4' },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        logging: console.log,
    }
);

app.set('sequelize', sequelize);

const HealthCheck = sequelize.define(process.env.DB_TABLE, {
    datetime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(),
    },
}, {
    timestamps: false,
    tableName: process.env.DB_TABLE,
});

app.get('/healthz', async (req, res) => {
    if (req.originalUrl !== '/healthz') {
        return res.status(400).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }

    try {
        await HealthCheck.create({});
        return res.status(200).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    } catch (error) {
        console.error('Error inserting record:', error);
        return res.status(503).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }
});

app.use((req, res) => {
    return res.status(400).set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
    }).end();
});

// Enhanced Error-handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
        return res.status(400).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();  // No response body
    }
    next(err); // Pass the error to the next handler if not JSON
});

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            await sequelize.authenticate();
            await sequelize.sync();
            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
            });
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    })();
}

module.exports = app;
