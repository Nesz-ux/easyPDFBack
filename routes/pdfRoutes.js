const express = require("express");
const multer = require("multer");
const { convertPdfToWord } = require("../controllers/pdfToWordController");
const { convertPdfToExcel } = require("../controllers/pdfToExcelController");
const { convertPdfToPowerPoint } = require("../controllers/pdfToPowerPointController");
const { convertPdfToJPG } = require ("../controllers/pdfToJPGController");
const router = express.Router();

// Configuración para cargar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/convertWord", upload.single("file"), convertPdfToWord);
router.post("/convertExcel", upload.single("file"), convertPdfToExcel);
router.post("/convertPowerPoint", upload.single("file"), convertPdfToPowerPoint);
router.post("/convertJPG", upload.single("file"), convertPdfToJPG);

module.exports = router;
