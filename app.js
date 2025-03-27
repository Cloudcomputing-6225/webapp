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
        statsdClient.increment('api.healthz_count');
        statsdClient.timing('api.healthz_time', Date.now() - start);
        res.status(200).json({ message: "Service is healthy" });
    } catch (error) {
        statsdClient.increment('api.healthz_failure_count');
        statsdClient.timing('api.healthz_time', Date.now() - start);
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
    const startTime = Date.now();
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const { originalname, mimetype, buffer, size } = req.file;
        const fileName = `file-${uuidv4()}-${originalname}`;

        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: mimetype,
        };

        logger.info(`Uploading file to S3: ${fileName}`);
        const s3Start = Date.now();
        await s3.send(new PutObjectCommand(s3Params));
        statsdClient.timing('s3.upload_time', Date.now() - s3Start);

        const fileRecord = await File.create({
            file_name: fileName,
            s3_path: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`,
            content_type: mimetype,
            size: size,
        });

        statsdClient.increment('api.upload_count');
        statsdClient.timing('api.upload_time', Date.now() - startTime);

        logger.info(`File uploaded and saved: ${fileName}`);
        res.status(201).json(fileRecord);
    } catch (error) {
        logger.error("File upload failed:", error);
        res.status(500).json({ message: "File upload failed", error: error.message });
    }
});

// Retrieve File Metadata
app.get('/v1/file/:id', async (req, res) => {
    const startTime = Date.now();
    try {
        const fileRecord = await File.findByPk(req.params.id);

        if (!fileRecord) {
            logger.warn(`File with ID ${req.params.id} not found.`);
            return res.status(404).json({ message: 'File not found' });
        }

        logger.info(`File retrieved: ${fileRecord.file_name}`);
        statsdClient.increment('api.retrieve_count');
        statsdClient.timing('api.retrieve_time', Date.now() - startTime);

        res.status(200).json({ s3_path: fileRecord.s3_path });
    } catch (error) {
        logger.error('Error retrieving file:', error);
        res.status(500).json({ message: 'Failed to retrieve file' });
    }
});

// Delete File from S3 and Database
app.delete('/v1/file/:id', async (req, res) => {
    const startTime = Date.now();
    try {
        const fileRecord = await File.findByPk(req.params.id);
        if (!fileRecord) {
            logger.warn(`File with ID ${req.params.id} not found for deletion.`);
            return res.status(404).json({ message: 'File not found' });
        }

        const s3Start = Date.now();
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileRecord.file_name }));
        statsdClient.timing('s3.delete_time', Date.now() - s3Start);

        await fileRecord.destroy();

        statsdClient.increment('api.delete_count');
        statsdClient.timing('api.delete_time', Date.now() - startTime);

        logger.info(`File deleted: ${fileRecord.file_name}`);
        res.status(204).end();
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ message: 'Failed to delete file' });
    }
});

if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });
}

export { app, File, sequelize };
