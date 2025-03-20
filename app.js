const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Multer storage configuration
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        acl: 'private',
        key: function (req, file, cb) {
            const fileName = `${Date.now()}_${file.originalname}`;
            cb(null, fileName);
        }
    })
});

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

const FileMetadata = sequelize.define('FileMetadata', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    s3Path: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    uploadTime: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
}, {
    timestamps: false,
    tableName: 'FileMetadata',
});

// Health check route
app.get('/healthz', async (req, res) => {
    if (req.originalUrl !== '/healthz') {
        return res.status(400).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }

    try {
        await sequelize.authenticate(); // Check DB connection
        return res.status(200).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    } catch (error) {
        console.error('Database connection error:', error);
        return res.status(503).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }
});

// Catch-all route for invalid URLs
app.use((req, res) => {
    return res.status(400).set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
    }).end();
});

// File upload endpoint
app.post('/files', upload.single('file'), async (req, res) => {
    try {
        const fileMetadata = await FileMetadata.create({
            fileName: req.file.originalname,
            s3Path: req.file.location,
        });
        res.status(201).json({ id: fileMetadata.id, s3Path: fileMetadata.s3Path });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Retrieve file metadata
app.get('/files/:id', async (req, res) => {
    try {
        const fileMetadata = await FileMetadata.findByPk(req.params.id);
        if (!fileMetadata) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.status(200).json({ s3Path: fileMetadata.s3Path });
    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete file
app.delete('/files/:id', async (req, res) => {
    try {
        const fileMetadata = await FileMetadata.findByPk(req.params.id);
        if (!fileMetadata) {
            return res.status(404).json({ error: 'File not found' });
        }

        await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: fileMetadata.s3Path.split('/').pop(),
        }).promise();

        await fileMetadata.destroy();
        res.status(204).end();
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
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
