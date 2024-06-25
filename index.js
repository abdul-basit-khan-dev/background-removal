// Importing necessary modules
const express = require('express');
const multer = require('multer');
const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = 5001;

// Setting up multer for file upload handling
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/remove-background', upload.single('image'), async (req, res) => {
    try {
        const imgPath = req.file.path;
        const fileType = req.file.mimetype;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(fileType)) {
            fs.unlinkSync(imgPath); 
            return res.status(400).json({ error: 'Invalid file type. Only PNG, JPEG, and JPG are allowed.' });
        }

        const blob = await removeBackground(imgPath);
        const buffer = Buffer.from(await blob.arrayBuffer());
        const dataURL = `data:image/png;base64,${buffer.toString("base64")}`;
        
        const timestamp = Date.now();
        const outputFileName = `uploads/output_${timestamp}.png`;
        
        fs.writeFileSync(outputFileName, dataURL.split(';base64,').pop(), { encoding: 'base64' });
        fs.unlinkSync(imgPath);
        res.json({ dataURL });
    } catch (error) {
        res.status(500).json({ error: `Error removing background: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
