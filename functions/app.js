const express = require('express');
const multer = require('multer');
const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

// Setting up multer for file upload handling
const upload = multer({ dest: 'uploads/' });

app.use(express.json({ limit: '50mb' }));

router.get("/", (req, res) => {
    res.json({ message: "Welcome to NodeJS Background Removal API's." });
});

router.post('/remove-background', upload.single('image'), async (req, res) => {
    try {
        const imgPath = req.file.path;
        const fileType = req.file.mimetype;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(fileType)) {
            scheduleDeletion(imgPath, 1); // Schedule deletion in 1 hour
            return res.status(400).json({ error: 'Invalid file type. Only PNG, JPEG, and JPG are allowed.' });
        }

        const blob = await removeBackground(imgPath);
        const buffer = Buffer.from(await blob.arrayBuffer());
        const dataURL = `data:image/png;base64,${buffer.toString("base64")}`;

        // Save the output file temporarily
        const timestamp = Date.now();
        const outputFileName = path.join('uploads', `output_${timestamp}.png`);
        fs.writeFileSync(outputFileName, dataURL.split(';base64,').pop(), { encoding: 'base64' });

        // Schedule the deletion of the files after 1 hour
        scheduleDeletion(imgPath, 30 * 1000);
        scheduleDeletion(outputFileName, 30 * 1000);

        res.json({ dataURL });
    } catch (error) {
        res.status(500).json({ error: `Error removing background: ${error.message}` });
    }
});

app.use("/", (req, res, next) => {
  console.log(`Received a ${req.method} request at ${req.originalUrl}`);
  next();
}, router);

function scheduleDeletion(filePath, milliseconds) {
    const deleteTime = new Date(Date.now() + milliseconds);
    schedule.scheduleJob(deleteTime, () => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }
    });
}

module.exports.handler = serverless(app);
