require("dotenv").config();
const extractTextFromPdf = require("./book/extractPdf");
const indexChunks = require("./book/indexChunks");
const splitTextIntoChunks = require("./book/splitTextIntoChunks");

const response = async () => {
  
  // 1. Extraer texto del PDF
  const text = await extractTextFromPdf("libro.pdf");
  // 2. Dividir el texto en fragmentos
  const chunks = splitTextIntoChunks(text);
  // // 3. Indexar fragmentos en Pinecone
  console.log("Indexando fragmentos...");
  await indexChunks(chunks);

}

response()
