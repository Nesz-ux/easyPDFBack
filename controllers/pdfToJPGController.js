const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFToImagesJob,
  ExportPDFToImagesTargetFormat,
  ExportPDFToImagesOutputType,
  ExportPDFToImagesParams,
  ExportPDFToImagesResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
} = require("@adobe/pdfservices-node-sdk");

const fs = require("fs");
const path = require("path");

exports.convertPdfToJPG = async (req, res) => {
  const deleteFilesAfterDelay = (files, delay) => {
    setTimeout(async () => {
      try {
        await Promise.all(
          files.map(async (file) => {
            try {
              const filePath = path.join(__dirname, "../uploads/", file);
              await fs.promises.access(filePath); // Verificar si el archivo existe
              await fs.promises.unlink(filePath);
              console.log(`Archivo eliminado: ${filePath}`);
            } catch (err) {
              if (err.code === "ENOENT") {
                console.warn(`Archivo ya fue eliminado: ${filePath}`);
              } else {
                console.error(`Error eliminando ${filePath}:`, err);
              }
            }
          })
        );
      } catch (err) {
        console.error("Error eliminando archivos:", err);
      }
    }, delay);
  };

  if (!req.file) {
    return res.status(400).json({ message: "No se ha cargado ningún archivo" });
  }

  let readStream;
  try {
    const filePath = req.file.path;
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return res.status(400).json({ error: "El archivo está vacío" });
    }

    console.log("Archivo recibido:", req.file);

    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
    });

    const pdfServices = new PDFServices({ credentials });

    readStream = fs.createReadStream(filePath);
    console.log("Subiendo archivo a Adobe PDF Services...");
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF,
    });

    if (!inputAsset || !inputAsset._assetId) {
      return res.status(500).json({ error: "No se pudo procesar el archivo" });
    }

    console.log("Archivo subido:", inputAsset);

    const params = new ExportPDFToImagesParams({
      targetFormat: ExportPDFToImagesTargetFormat.JPEG, // Cambio a JPEG
      outputType: ExportPDFToImagesOutputType.LIST_OF_PAGE_IMAGES,
    });

    console.log("Creando tarea de conversión...");
    const job = new ExportPDFToImagesJob({ inputAsset, params });

    const pollingURL = await pdfServices.submit({ job });

    const pdfServiceResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFToImagesResult,
    });

    if (!pdfServiceResponse.result || !pdfServiceResponse.result.assets) {
      throw new Error("No se pudo obtener el resultado de la conversión");
    }

    const resultAssets = pdfServiceResponse.result.assets;
    const outputFilePaths = [];

    for (let i = 0; i < resultAssets.length; i++) {
      const outputFileName = `${
        path.parse(req.file.originalname).name
      }-${i}.jpeg`;
      const outputFilePath = path.join(
        __dirname,
        "../uploads/",
        outputFileName
      );
      outputFilePaths.push(outputFileName);

      console.log(`Descargando archivo ${outputFileName}...`);

      const streamAsset = await pdfServices.getContent({
        asset: resultAssets[i],
      });

      const outputStream = fs.createWriteStream(outputFilePath);

      streamAsset.readStream.pipe(outputStream);

      // Esperamos que la escritura del archivo se complete
      await new Promise((resolve, reject) => {
        outputStream.on("finish", () => {
          console.log(`Archivo ${outputFileName} guardado correctamente.`);
          resolve();
        });

        outputStream.on("error", (err) => {
          console.error(`Error al escribir ${outputFileName}:`, err);
          reject(err);
        });
      });
    }

    // Eliminar el archivo PDF original después de la conversión
    try {
      await fs.promises.unlink(filePath);
      console.log(`Archivo PDF ${filePath} eliminado.`);
    } catch (err) {
      console.error(`Error eliminando ${filePath}:`, err);
    }

    // Enviar la respuesta después de que todo el proceso termine
    res.json({ message: "Archivos convertidos con éxito", outputFilePaths });

    // Programar la eliminación de los archivos en 10 segundos
    deleteFilesAfterDelay(outputFilePaths, 120 * 1000);
  } catch (err) {
    if (
      err instanceof SDKError ||
      err instanceof ServiceUsageError ||
      err instanceof ServiceApiError
    ) {
      console.error("Error en Adobe PDF Services", err);
    } else {
      console.error("Error en la conversión", err);
    }
    res
      .status(500)
      .json({ error: "Error en la conversión del PDF a imágenes" });
  } finally {
    if (readStream) {
      readStream.destroy();
    }
  }
};
