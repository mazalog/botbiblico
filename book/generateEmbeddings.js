const {OpenAI} = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Asegúrate de que la variable de entorno esté configurada
});

async function generateEmbedding(text) {

  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });


  return response.data[0].embedding;
}


module.exports = generateEmbedding;
