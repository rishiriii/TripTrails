// app.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import tripsRouter from './routes/trips.js';  // Import default export
import driveRouter from './routes/drive.js'; // Import drive routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Use tripsRouter for handling routes under '/trips'
app.use('/trips', tripsRouter);
app.use('/drive', driveRouter); // Use the drive route
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
