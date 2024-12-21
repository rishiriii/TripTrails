import express from 'express';
import fs from 'fs';
import { google } from 'googleapis';
import multer from 'multer';

const router = express.Router();

// Configure Multer for file upload
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded files

// Load service account credentials
const KEY_FILE_PATH = './driveServiceAccount.json'; // Path to your service account JSON file
const DRIVE_FOLDER_ID = '1L-3iz4qHC5cc8lupxgm2lQKOVaihL1H2'; // Replace with your shared folder ID from Google Drive

// Authenticate service account
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// Route to handle file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Upload route hit'); // Log when the route is accessed

  const file = req.file;

  if (!file) {
    console.error('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    console.log('File to upload:', file.originalname);

    const fileMetadata = {
      name: file.originalname,
      parents: [DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    console.log('Uploading file to Google Drive...');
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    console.log('File uploaded successfully:', response.data);

    // Clean up the temporary file
    fs.unlinkSync(file.path);
    res.status(200).json({
      message: 'File uploaded successfully',
      fileId: response.data.id,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

export default router;
