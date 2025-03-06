require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");
const e = require("express");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Rutas
app.use("/api", pdfRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en: ${PORT}`);
});
