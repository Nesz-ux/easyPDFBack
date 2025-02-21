import multer from "multer";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import {Readable} from "stream";

const storage = multer.memoryStorage();
const uploadFile = multer({storage}).single("file");

export const convertPdfToWord = async (req, res) => {
    if(!req.file) {
        return res.status(400).json({message: "No se subió ningún archivo"});
    }

    try {
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        let textContent = "";

        for (const page of pdfDoc.getPages()){
            textContent +- page.getTextContent(); + "/n"
        }

        const docxBuffer = await mammoth.convertToBuffer({
            rawText: textContent,
        })

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="archivo.docx"`);  
        res.send(docxBuffer); 
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Hubo un error al convertir el archivo"});
    }
}