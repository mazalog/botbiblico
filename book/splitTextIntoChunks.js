function splitTextIntoChunks(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  module.exports = splitTextIntoChunks;
  