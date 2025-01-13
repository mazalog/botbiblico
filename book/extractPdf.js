const fs = require("fs");
const pdfParse = require("pdf-parse");

async function extractTextFromPdf(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(pdfBuffer);
  return data.text; // Texto extraído
}

module.exports = extractTextFromPdf;
