// Importación de dependencias necesarias
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ExportPDFJob,
    ExportPDFParams,
    ExportPDFTargetFormat,
    ExportPDFResult,
    SDKError,
    ServiceUsageError,
    ServiceApiError,
  } = require("@adobe/pdfservices-node-sdk");
  
  const fs = require("fs");
  const path = require("path");
  
  // Controlador para convertir un archivo PDF a Word (.docx)
  exports.convertPdfToWord = async (req, res) => {
    // Verificar si se cargó un archivo en la solicitud
    if (!req.file) {
      return res.status(400).json({ message: "No se ha cargado ningún archivo" });
    }
  
    let readStream;
    try {
      const filePath = req.file.path;
  
      // Verificar si el archivo no está vacío
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return res.status(400).json({ error: "El archivo está vacío" });
      }
  
      console.log("Archivo recibido:", req.file);
  
      // Configurar credenciales para Adobe PDF Services
      const credentials = new ServicePrincipalCredentials({
        clientId: process.env.PDF_SERVICES_CLIENT_ID,
        clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
      });
  
      const pdfServices = new PDFServices({ credentials });
  
      // Crear un stream de lectura para el archivo
      readStream = fs.createReadStream(filePath);
      readStream.on("error", (err) => {
        console.error("Error al leer el archivo:", err);
        return res.status(500).json({ error: "Error al leer el archivo" });
      });
  
      console.log("Subiendo archivo a Adobe PDF Services...");
  
      // Subir el archivo a Adobe PDF Services
      let inputAsset;
      try {
        inputAsset = await pdfServices.upload({
          readStream,
          mimeType: MimeType.PDF,
        });
      } catch (uploadError) {
        console.error("Error al subir el archivo:", uploadError);
        return res
          .status(500)
          .json({ error: "Error al subir el archivo a Adobe PDF Services" });
      }
  
      // Verificar si el archivo se subió correctamente
      if (!inputAsset || !inputAsset._assetId) {
        return res.status(500).json({
          error: "No se pudo procesar el archivo en Adobe PDF Services",
        });
      }
  
      console.log("Archivo subido con éxito:", inputAsset);
  
      // Configurar parámetros para la conversión a Word
      const params = new ExportPDFParams({
        targetFormat: ExportPDFTargetFormat.DOCX,
      });
  
      console.log("Creando tarea de conversión...");
  
      // Crear tarea de exportación
      const job = new ExportPDFJob({
        inputAsset,
        params,
      });
  
      console.log("Enviando tarea de conversión...");
  
      // Enviar la tarea de conversión a Adobe PDF Services
      const pollingURL = await pdfServices.submit({ job });
  
      // Obtener el resultado de la conversión
      const pdfServiceResponse = await pdfServices.getJobResult({
        pollingURL,
        resultType: ExportPDFResult,
      });
  
      // Verificar si la conversión fue exitosa
      if (!pdfServiceResponse.result || !pdfServiceResponse.result.asset) {
        throw new Error("Error al obtener el resultado de la conversión.");
      }
  
      const resultAsset = pdfServiceResponse.result.asset;
  
      // Obtener el contenido del archivo convertido
      const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
      // Obtener el nombre original del archivo sin la extensión
      const originalFileName = path.parse(req.file.originalname).name;
      const outputFileName = `${originalFileName}.docx`;
      const outputFilePath = path.join(__dirname, "../uploads", outputFileName);
  
      // Crear un stream de escritura para guardar el archivo convertido
      const outputStream = fs.createWriteStream(outputFilePath);
  
      console.log("Descargando archivo convertido...");
  
      // Guardar el archivo convertido en el servidor
      streamAsset.readStream.pipe(outputStream);
  
      // Una vez que se haya terminado de escribir el archivo, enviarlo como descarga
      outputStream.on("finish", () => {
        res.download(outputFilePath, outputFileName, (err) => {
          if (err) {
            console.error("Error al enviar el archivo:", err);
            return res
              .status(500)
              .json({ error: "Error al descargar el archivo." });
          }
  
          // Eliminar archivos temporales después de la descarga
          try {
            fs.unlinkSync(filePath);
            fs.unlinkSync(outputFilePath);
          } catch (cleanupError) {
            console.error(
              "Error al eliminar los archivos temporales:",
              cleanupError
            );
          }
        });
      });
    } catch (err) {
      // Manejo de errores específicos de la API de Adobe PDF Services
      if (
        err instanceof SDKError ||
        err instanceof ServiceUsageError ||
        err instanceof ServiceApiError
      ) {
        console.log("Error en Adobe PDF Services:", err);
      } else {
        console.log("Error en la conversión:", err);
      }
    } finally {
      // Cerrar el stream de lectura si está abierto
      if (readStream) {
        readStream.destroy();
      }
    }
  };
  