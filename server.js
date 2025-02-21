import express from 'express'; 
import pdfRoutes from './routes/pdfRoutes.js';

const server = express();
server.use(express.json());

server.use('/pdf', pdfRoutes);

server.listen(5000, () => {
    console.log('Server is running on port 5000');
});