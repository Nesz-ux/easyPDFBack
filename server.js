require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");
const e = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//Rutas
app.use("/api", pdfRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en: ${PORT}`);
});
