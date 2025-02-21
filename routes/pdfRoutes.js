const express = require ('express');
import { uploadFile, convertPdfToWord } from '../controllers/pdfToWordController.js';

const router = express.Router();

router.post('/convert', uploadFile, convertPdfToWord);

export default router;