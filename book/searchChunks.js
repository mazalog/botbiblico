const { Pinecone } = require("@pinecone-database/pinecone");
const generateEmbedding = require("./generateEmbeddings");

async function searchChunks(query) {
  // Genera el embedding para la consulta
  const embedding = await generateEmbedding(query);

  // Configura el cliente Pinecone
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  // Obtén el índice donde realizarás la búsqueda
  const index = client.Index("book-index", "https://book-index-zmgzftz.svc.aped-4627-b74a.pinecone.io");

  // Realiza la consulta en Pinecone

  const result = await index.namespace('libro').query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
    includeValues: true,
});

  // Devuelve los textos de los fragmentos encontrados
  if (result.matches) {
    return result.matches.map((match) => match.metadata.text);
  } else {
    console.warn("No se encontraron resultados para la consulta.");
    return [];
  }
}

module.exports = searchChunks;
