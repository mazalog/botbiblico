require("dotenv").config();

const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Asegúrate de que la variable de entorno esté configurada
});

module.exports = { openai };