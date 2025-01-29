const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to block requests with payloads
app.use((req, res, next) => {
    if (req.header('Content-Length') && parseInt(req.header('Content-Length')) > 0) {
        return res.status(400)
            .set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            })

    } else {
        next();
    }
});

// Initialize Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        logging: false,
        timezone: '-05:00',
    }
);

// Define the health_checks model
const HealthCheck = sequelize.define('health_checks', {
    datetime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(), // Use JavaScript's Date for current time
    },
}, {
    timestamps: false,
    tableName: 'health_checks',
});

// Middleware to handle unsupported HTTP methods for /healthz
app.all('/healthz', (req, res, next) => {
    if (req.method !== 'GET') {
        res.status(405) // Method Not Allowed
            .set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            })
            .end();
    } else {
        next();
    }
});

// /healthz endpoint
app.get('/healthz', async (req, res) => {
    // Check for query parameters and their lengths
    if (Object.keys(req.query).length > 0) {
        res.status(400)
            .set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            })

        return;
    }

    try {
        // Insert a record into the health_checks table
        await HealthCheck.create({});

        // Respond with 200 if the query succeeds
        res.status(200)
            .set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            })
            .end();
    } catch (error) {
        console.error('Error inserting record:', error);

        // Respond with 503 if the query fails
        res.status(503)
            .set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            })
            .end();
    }
});

// Catch-all middleware for invalid paths
app.use((req, res) => {
    res.status(400)
        .set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        })

});

// Sync Sequelize models and start the server
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        await sequelize.sync(); // Ensures the health_checks table exists
        console.log('Database synced successfully.');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})();
