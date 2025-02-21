const express = require("express");
const { uploadFile, convertPdfToWord } = require("../controllers/pdfToWordController.js");

const router = express.Router();

router.post("/convert", uploadFile, convertPdfToWord);

module.exports = router;
