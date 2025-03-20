import express from 'express';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import winston from 'winston';
import StatsD from 'node-statsd';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.disable('x-powered-by');

// Logger Configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' }),
    ],
});

logger.info('Logger initialized');

// AWS S3 Configuration (Using IAM Role)
const s3 = new S3Client({ region: process.env.AWS_REGION });

// StatsD Configuration
const statsdClient = new StatsD({ host: 'localhost', port: 8125 });

// Sequelize Database Connection (Using AWS RDS)
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: (msg) => logger.info(msg),
});

// File Metadata Model
const File = sequelize.define('File', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    file_name: { type: DataTypes.STRING, allowNull: false },
    s3_path: { type: DataTypes.STRING, allowNull: false },
    content_type: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    upload_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'files', timestamps: false });

// Database Initialization
(async () => {
    try {
        await sequelize.sync({ alter: true });
        logger.info('Database synchronized');
    } catch (error) {
        logger.error('Database sync failed:', error);
    }
})();

// Health Check Endpoint
app.get('/healthz', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ message: "Service is healthy" });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({ message: "Service unavailable" });
    }
});

app.all('/healthz', (req, res, next) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: "Method Not Allowed" });
    }
    next();
});

// Configure Multer for Form-Data Uploads
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed!"), false);
        }
        cb(null, true);
    }
});

// Upload File to S3 (Accepts Form-Data)
app.post('/v1/file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        // Extract file details
        const { originalname, mimetype, buffer, size } = req.file;

        // Generate unique file name
        const fileName = `file-${uuidv4()}-${originalname}`;

        // S3 Upload Parameters
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: mimetype,
        };

        logger.info(`Uploading file to S3: ${fileName}`);

        // Upload to S3
        await s3.send(new PutObjectCommand(s3Params));

        // Save file metadata in the database
        const fileRecord = await File.create({
            file_name: fileName,
            s3_path: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`,
            content_type: mimetype,
            size: size,
        });

        res.status(201).json(fileRecord);
    } catch (error) {
        logger.error("File upload failed:", error);
        res.status(500).json({ message: "File upload failed", error: error.message });
    }
});

app.get('/v1/file/:id', async (req, res) => {
    try {
        const fileRecord = await File.findByPk(req.params.id);

        if (!fileRecord) {
            console.log(`File with ID ${req.params.id} not found in the database.`);
            return res.status(404).json({ message: 'File not found' });
        }

        console.log(`File found:`, fileRecord);  // Debugging
        res.status(200).json({ s3_path: fileRecord.s3_path });
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({ message: 'Failed to retrieve file' });
    }
});

// Delete File from S3 and Database
app.delete('/v1/file/:id', async (req, res) => {
    try {
        const fileRecord = await File.findByPk(req.params.id);
        if (!fileRecord) {
            return res.status(404).json({ message: 'File not found' });
        }

        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileRecord.file_name }));
        await fileRecord.destroy();

        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete file' });
    }
});

// // Start Server
// app.listen(port, () => {
//     logger.info(`Server running on port ${port}`);
// });

if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });
}

export { app, File, sequelize };
