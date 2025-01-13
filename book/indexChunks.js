const { Pinecone } = require("@pinecone-database/pinecone");
const generateEmbedding = require("./generateEmbeddings");

// Función para dividir en lotes
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function indexChunks(chunks) {
  // Configura el cliente Pinecone
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY, // Usa la API Key desde tu archivo .env
  });

  // Obtén el índice donde insertarás los vectores
  const index = client.Index("book-index", "https://book-index-zmgzftz.svc.aped-4627-b74a.pinecone.io");

  // Genera los embeddings para todos los fragmentos
  const records = [];
  let i = 0;
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk);
      records.push({
        id: `chunk-${i}`,
        values: embedding,
        metadata: { text: chunk },
      });
      console.log(`Fragmento ${i} procesado.`);
      i++;
    } catch (error) {
      console.error(`Error generando embedding para el fragmento ${i}:`, error);
    }
  }

  // Divide los registros en lotes pequeños
  const BATCH_SIZE = 100; // Ajusta según el tamaño de tus vectores
  const batches = chunkArray(records, BATCH_SIZE);

  // Inserta los lotes en Pinecone
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    try {
      await index.namespace('libro').upsert(batches[batchIndex])
      console.log(`Lote ${batchIndex + 1} indexado exitosamente.`);
    } catch (error) {
      console.error(`Error indexando el lote ${batchIndex + 1}:`, error);
    }
  }

  console.log("Todos los fragmentos han sido indexados exitosamente.");
}

module.exports = indexChunks;
