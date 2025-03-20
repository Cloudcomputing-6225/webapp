// const express = require('express');
// const { Sequelize, DataTypes } = require('sequelize');
// const AWS = require('aws-sdk');
// const multer = require('multer');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());

// AWS.config.update({
//     region: process.env.AWS_REGION,
//     credentials: new AWS.Credentials({
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     }),
// });
// const s3 = new AWS.S3();

// const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// const upload = multer({
//     storage: multer.memoryStorage({

//         limits: { fileSize: 5 * 1024 * 1024 },
//         // s3: s3,
//         // bucket: BUCKET_NAME,
//         // acl: 'private',
//         // key: function (req, file, cb) {
//         //     const fileName = `${Date.now()}_${file.originalname}`;
//         //     cb(null, fileName);
//         // }
//     })
// });

// const sequelize = new Sequelize(
//     process.env.DB_NAME,
//     process.env.DB_USER,
//     process.env.DB_PASS,
//     {
//         host: process.env.DB_HOST,
//         dialect: 'mysql',
//         dialectOptions: { charset: 'utf8mb4' },
//         pool: {
//             max: 10,
//             min: 0,
//             acquire: 30000,
//             idle: 10000,
//         },
//         logging: console.log,
//     }
// );

// app.set('sequelize', sequelize);

// const FileMetadata = sequelize.define('FileMetadata', {
//     id: {
//         type: DataTypes.UUID,
//         defaultValue: Sequelize.UUIDV4,
//         primaryKey: true,
//     },
//     fileName: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     s3Path: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     uploadTime: {
//         type: DataTypes.DATE,
//         defaultValue: Sequelize.NOW,
//     },
// }, {
//     timestamps: false,
//     tableName: 'FileMetadata',
// });


// // ✅ File Upload API
// app.post('/files', upload.single('file'), async (req, res) => {
//     console.log("🔹 Received Headers:", req.headers);
//     console.log("🔹 Received Body:", req.body);
//     console.log("🔹 Received File:", req.file);

//     if (!req.file) {
//         console.error("❌ No file received!");
//         return res.status(400).json({ error: "No file uploaded" });
//     }

//     try {
//         const fileMetadata = await FileMetadata.create({
//             fileName: req.file.originalname,
//             s3Path: req.file.location,
//         });

//         console.log("✅ File uploaded successfully:", fileMetadata);
//         res.status(201).json({ id: fileMetadata.id, s3Path: fileMetadata.s3Path });
//     } catch (error) {
//         console.error("❌ File upload error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });


// // ✅ Get File Metadata API
// app.get("/files/:id", async (req, res) => {
//     try {
//         const fileMetadata = await FileMetadata.findByPk(req.params.id);
//         if (!fileMetadata) {
//             return res.status(404).json({ error: "File not found" });
//         }
//         res.status(200).json({ s3Path: fileMetadata.s3Path });
//     } catch (error) {
//         console.error("File retrieval error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// // ✅ Delete File API
// app.delete("/files/:id", async (req, res) => {
//     try {
//         const fileMetadata = await FileMetadata.findByPk(req.params.id);
//         if (!fileMetadata) {
//             return res.status(404).json({ error: "File not found" });
//         }

//         await s3
//             .deleteObject({
//                 Bucket: BUCKET_NAME,
//                 Key: fileMetadata.s3Path.split("/").pop(),
//             })
//             .promise();

//         await fileMetadata.destroy();
//         res.status(204).end();
//     } catch (error) {
//         console.error("File deletion error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

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

// // app.use((req, res, next) => {
// //     if (req.header('Content-Length') && parseInt(req.header('Content-Length')) > 0) {
// //         return res.status(400).set({
// //             'Cache-Control': 'no-cache, no-store, must-revalidate',
// //             'Pragma': 'no-cache',
// //             'X-Content-Type-Options': 'nosniff',
// //         }).end();
// //     }
// //     next();
// // });

// // Health check route
// app.get('/healthz', async (req, res) => {
//     if (req.originalUrl !== '/healthz') {
//         return res.status(400).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     }

//     try {
//         await sequelize.authenticate(); // Check DB connection
//         return res.status(200).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     } catch (error) {
//         console.error('Database connection error:', error);
//         return res.status(503).set({
//             'Cache-Control': 'no-cache, no-store, must-revalidate',
//             'Pragma': 'no-cache',
//             'X-Content-Type-Options': 'nosniff',
//         }).end();
//     }
// });

// // Catch-all route for invalid URLs
// app.use((req, res) => {
//     return res.status(400).set({
//         'Cache-Control': 'no-cache, no-store, must-revalidate',
//         'Pragma': 'no-cache',
//         'X-Content-Type-Options': 'nosniff',
//     }).end();
// });

// if (process.env.NODE_ENV !== 'test') {
//     (async () => {
//         try {
//             await sequelize.authenticate();
//             await sequelize.sync();
//             // app.listen(PORT, () => {
//             //     console.log(`Server running on http://localhost:${PORT}`);
//             // });

//             app.listen(PORT, "0.0.0.0", () => {
//                 console.log(`Server running on http://0.0.0.0:${PORT}`);
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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ Configure AWS S3 (IAM Role-Based Authentication)
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

// ✅ Set up Multer for File Upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ✅ Initialize Sequelize (MySQL Database)
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
        logging: false,
    }
);

app.set('sequelize', sequelize);

// ✅ Define File Metadata Model
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

// ✅ Helper Function to Get IAM-Accessible Bucket
async function getBucketName() {
    try {
        const buckets = await s3.listBuckets().promise();
        if (!buckets.Buckets.length) {
            throw new Error("❌ No accessible S3 bucket found for IAM role.");
        }
        return buckets.Buckets[0].Name; // Use the first available bucket
    } catch (error) {
        console.error("❌ Error fetching S3 bucket name:", error);
        throw error;
    }
}

// ✅ File Upload API (Without Hardcoding Bucket Name)
app.post("/files",
    upload.single("file"),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const bucketName = await getBucketName(); // Dynamically get bucket name
            const fileName = `${Date.now()}_${req.file.originalname}`;

            // Upload file to S3
            const uploadParams = {
                Bucket: bucketName,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            const uploadResult = await s3.upload(uploadParams).promise();

            // Save file metadata in MySQL
            const fileMetadata = await FileMetadata.create({
                fileName: req.file.originalname,
                s3Path: uploadResult.Location,
            });

            console.log("✅ File uploaded successfully:", fileMetadata);
            res.status(201).json({ id: fileMetadata.id, s3Path: fileMetadata.s3Path });
        } catch (error) {
            console.error("❌ File upload error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

// ✅ Get File Metadata API
app.get("/files/:id", async (req, res) => {
    try {
        const fileMetadata = await FileMetadata.findByPk(req.params.id);
        if (!fileMetadata) {
            return res.status(404).json({ error: "File not found" });
        }
        res.status(200).json({ s3Path: fileMetadata.s3Path });
    } catch (error) {
        console.error("❌ File retrieval error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Delete File API
app.delete("/files/:id", async (req, res) => {
    try {
        const fileMetadata = await FileMetadata.findByPk(req.params.id);
        if (!fileMetadata) {
            return res.status(404).json({ error: "File not found" });
        }

        // Get bucket name dynamically
        const bucketName = await getBucketName();

        // Extract file key from S3 URL
        const fileKey = new URL(fileMetadata.s3Path).pathname.split("/").pop();

        // Delete file from S3
        await s3.deleteObject({ Bucket: bucketName, Key: fileKey }).promise();

        // Delete file metadata from MySQL
        await fileMetadata.destroy();
        res.status(204).end();

    } catch (error) {
        console.error("❌ File deletion error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Health Check Route (Fixes `405` errors for non-GET requests)
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

// ✅ Enforce `Content-Length` check (Fixes `400` response for invalid header)
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

// ✅ Health check API with database check
app.get('/healthz', async (req, res) => {
    try {
        await sequelize.authenticate(); // Check DB connection
        res.status(200).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    } catch (error) {
        console.error('❌ Database connection error:', error);
        res.status(503).set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        }).end();
    }
});

// ✅ Catch-all route for invalid URLs
app.use((req, res) => {
    res.status(400).set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
    }).end();
});

// ✅ Start Server (Only if database is reachable)
if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            await sequelize.authenticate();
            await sequelize.sync();
            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
            });
        } catch (error) {
            console.error('❌ Unable to connect to the database:', error);
        }
    })();
}

module.exports = app;
