const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Asegúrate de que la variable de entorno esté configurada
});

async function generateAnswer(question, context) {

  // console.log(`Contexto relevante del libro:\n${context.join('\n')}\n\nPregunta: ${question}`)
  const messages = [
    { role: 'system', content: 'Eres un asistente experto en el contenido del libro.' },
    { role: 'user', content: `Contexto relevante del libro, solo puedes responder con fragmentos de texto presentados en el contexto por nada puedes modificar o inventar oraciones:\n${context.join('\n')}\n\nPregunta: ${question}` },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
    max_tokens: 300,
  });

  return response.choices[0].message.content.trim();
}

module.exports = generateAnswer;