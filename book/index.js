require("dotenv").config();
const extractTextFromPdf = require("./extractPdf");
const indexChunks = require("./indexChunks");
const searchChunks = require("./searchChunks");
const generateAnswer = require("./generateAnswer");
const splitTextIntoChunks = require("./splitTextIntoChunks");

const response = async ({question}) => {
  
  // 4. Hacer una pregunta
  const relevantChunks = await searchChunks(question);
  // 5. Generar respuesta basada en contexto
  const answer = await generateAnswer(question, relevantChunks);
  // console.log("Respuesta:", answer);
  return answer
}

module.exports = response;
