// const express = require('express');
// const { Sequelize, DataTypes } = require('sequelize');
// const AWS = require('aws-sdk');
// const multer = require('multer');
// const multerS3 = require('multer-s3');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());

// // Configure AWS SDK
// AWS.config.update({ region: process.env.aws_region });
// const s3 = new AWS.S3();

// // Database connection
// const sequelize = new Sequelize(
//     process.env.db_name,
//     process.env.db_user,
//     process.env.db_pass,
//     {
//         host: process.env.db_host,
//         dialect: 'mysql',
//         dialectOptions: { charset: 'utf8mb4' },
//         pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
//         logging: false,
//     }
// );

// // Define File Model
// const File = sequelize.define(process.env.db_table, {
//     id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
//     fileName: { type: DataTypes.STRING, allowNull: false },
//     s3Url: { type: DataTypes.STRING, allowNull: false },
// }, {
//     timestamps: true,
//     tableName: process.env.db_table // Explicitly defining table name from environment variable
// });

// // Middleware: Restrict non-GET methods on /healthz
// app.all('/healthz', (req, res, next) => {
//     if (req.method !== 'GET') {
//         return res.status(405).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     }
//     next();
// });

// // Middleware: Reject requests with Content-Length > 0 on /healthz
// app.use((req, res, next) => {
//     if (req.header('Content-Length') && parseInt(req.header('Content-Length')) > 0) {
//         return res.status(400).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     }
//     next();
// });

// // Health Check Endpoint
// app.get('/healthz', async (req, res) => {
//     if (req.originalUrl !== '/healthz') {
//         return res.status(400).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     }

//     try {
//         await sequelize.authenticate();
//         return res.status(200).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     } catch (error) {
//         console.error('Database connection error:', error);
//         return res.status(503).json({
//             error: 'Service Unavailable: Database connection failed',
//             details: error.message
//         });
//     }
// });

// // Multer S3 storage configuration
// const upload = multer({
//     storage: multerS3({
//         s3: s3,
//         bucket: process.env.s3_bucket,
//         metadata: (req, file, cb) => {
//             cb(null, { fieldName: file.fieldname });
//         },
//         key: (req, file, cb) => {
//             cb(null, `${Date.now()}-${file.originalname}`);
//         }
//     })
// });

// // File Upload API
// app.post('/upload', upload.single('file'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded. Please attach a file.' });
//         }

//         const newFile = await File.create({
//             fileName: req.file.originalname,
//             s3Url: req.file.location
//         });
//         res.status(201).json(newFile);
//     } catch (error) {
//         console.error("Upload error:", error);
//         res.status(500).json({ error: 'File upload failed', details: error.message });
//     }
// });

// // Get List of Files API
// app.get('/files', async (req, res) => {
//     try {
//         const files = await File.findAll();
//         if (files.length === 0) {
//             return res.status(400).json({ error: 'No files found' });
//         }
//         res.status(200).json(files);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch files' });
//     }
// });

// // Delete File API
// app.delete('/files/:id', async (req, res) => {
//     try {
//         const file = await File.findByPk(req.params.id);
//         if (!file) return res.status(404).json({ error: 'File not found' });

//         // Extract the correct S3 Key from full URL
//         const s3Key = file.s3Url.replace(`https://${process.env.s3_bucket}.s3.amazonaws.com/`, '');

//         // Delete from S3
//         await s3.deleteObject({ Bucket: process.env.s3_bucket, Key: s3Key }).promise();

//         // Delete from database
//         await file.destroy();
//         res.status(200).json({ message: 'File deleted successfully' });
//     } catch (error) {
//         console.error("Delete error:", error);
//         res.status(500).json({ error: 'Failed to delete file', details: error.message });
//     }
// });

// // Middleware: Catch-all for unknown routes
// app.use((req, res) => {
//     return res.status(400).set({
//         'Cache-Control': 'no-cache, no-store, must-revalidate',
//         'Pragma': 'no-cache',
//         'X-Content-Type-Options': 'nosniff',
//     }).end();
// });

// // Global Error Handling Middleware
// app.use((err, req, res, next) => {
//     if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
//         console.error('JSON Parse Error:', err);
//         return res.status(400).json({ error: 'Invalid JSON format' });
//     }

//     console.error('Unhandled error:', err);
//     res.status(err.status || 500).json({
//         error: err.message || 'Internal Server Error'
//     });
// });

// if (process.env.NODE_ENV !== 'test') {
//     (async () => {
//         try {
//             await sequelize.sync();
//             app.listen(PORT, () => {
//                 console.log(`Server running on http://localhost:${PORT}`);
//             });
//         } catch (error) {
//             console.error('Unable to connect to the database:', error);
//         }
//     })();
// }

// module.exports = app;


const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const crypto = require('crypto'); // ✅ Added for unique filenames
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configure AWS SDK
AWS.config.update({ region: process.env.aws_region });
const s3 = new AWS.S3();

// Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        dialectOptions: { charset: 'utf8mb4' },
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        logging: false,
    }
);

// Define File Model
const File = sequelize.define(process.env.DB_TABLE, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fileName: { type: DataTypes.STRING, allowNull: false },
    s3Url: { type: DataTypes.STRING, allowNull: false },
}, {
    timestamps: true,
    tableName: process.env.DB_TABLE
});

// Middleware: Restrict non-GET methods on /healthz
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

// Middleware: Reject requests with Content-Length > 0 on /healthz
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

// Health Check Endpoint
app.get('/healthz', async (req, res) => {
    try {
        await sequelize.authenticate();
        return res.status(200).end(); // ✅ Minimal response for better performance
    } catch (error) {
        console.error('Database connection error:', error);
        return res.status(503).json({
            error: 'Service Unavailable: Database connection failed',
            details: error.message
        });
    }
});

// Multer S3 storage configuration (Prevents overwrites)
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.s3_bucket,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uniqueKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
            cb(null, uniqueKey);
        }
    })
});

// File Upload API
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please attach a file.' });
        }

        const newFile = await File.create({
            fileName: req.file.originalname,
            s3Url: req.file.location
        });
        res.status(201).json(newFile);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'File upload failed', details: error.message });
    }
});

// Get List of Files API
app.get('/files', async (req, res) => {
    try {
        const files = await File.findAll();
        if (files.length === 0) {
            return res.status(404).json({ error: 'No files found' });
        }
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// Delete File API (Fixes S3 Key Handling)
app.delete('/files/:id', async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        // Extract only the key part from the S3 URL
        const s3UrlParts = file.s3Url.split('/');
        const s3Key = s3UrlParts.slice(3).join('/');

        await s3.deleteObject({ Bucket: process.env.s3_bucket, Key: s3Key }).promise();
        await file.destroy();

        res.status(204).end(); // ✅ Follows REST best practices
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
});

// Middleware: Catch-all for unknown routes
app.use((req, res) => {
    return res.status(400).set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
    }).end();
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
        console.error('JSON Parse Error:', err);
        return res.status(400).json({ error: 'Invalid JSON format' });
    }

    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
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
