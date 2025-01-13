const fs = require('fs')
const util = require('util')
const AWS = require('aws-sdk')
const { openai } = require('./helper')
const mp3Duration = require('mp3-duration');
const { default: axios } = require('axios');

const exec = util.promisify(require('child_process').exec)

require("dotenv").config()


AWS.config.loadFromPath('./configaws.json')

const Polly = new AWS.Polly({
    region: "us-east-1"
})

async function convertToMP3(audioBuffer, id) {
    try {
        const filePath = `./audios/${id}.ogg`;
        fs.writeFileSync(filePath, audioBuffer);

        const command = `ffmpeg -i ${filePath} -codec:a libmp3lame -qscale:a 2 ./audios/${id}mp3.mp3`;
        await exec(command);

        const mp3Buffer = fs.createReadStream(`./audios/${id}mp3.mp3`);

        const transcription = await openai.createTranscription(mp3Buffer, 'whisper-1')
        if (transcription) {
            return transcription.data.text
        } else {
            return false
        }

    } catch (error) {
        console.error('Error in convertToMp3:', error);
        // throw error;
        return false
    }
}

function compliesForAudio(text) {
    if (text.length > 600) {
        return false;
    }

    if (text.includes("http://") || text.includes("https://")) {
        return false;
    }

    const caracteresEspeciales = /[!@#$%^&*(),.?":{}|<>]/g;
    const caracteresEspecialesEncontrados = text.match(caracteresEspeciales);
    if (caracteresEspecialesEncontrados && caracteresEspecialesEncontrados.length > 10) {
        return false;
    }

    const random = Math.random()
    if (random <= 0.35) {
        return false;
    }

    return true;
}

function cleanTextWithEmojis(text) {
    // Expresión regular para encontrar emojis Unicode
    const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu;

    // Obtener todos los emojis de la cadena de texto
    const emojis = text.match(emojiRegex);

    // Verificar la cantidad de emojis encontrados
    if (emojis && emojis.length > 4) {
        return false;
    }

    // Remover los emojis si hay más de cuatro
    const cleanedText = text.replace(emojiRegex, '');

    return cleanedText;
}

async function bufferToObj(buffer, filename) {

    try {
        // Obtener la duración del archivo MP3
        const duration = await mp3Duration(buffer);

        // Convertir el buffer a cadena base64
        const data = buffer.toString('base64');

        // Calcular el tamaño del archivo en bytes
        const filesize = buffer.length;

        // Crear el objeto con los parámetros
        const obj = {
            mimetype: 'audio/mpeg',
            data,
            filename,
            filesize,
            duration
        };

        return obj;
    } catch (err) {
        console.log(err)
        return false
    }

}

async function textToMp3(message) {

    try {

        const text = message

        if (!text) return false

        const input = {
            Engine: "generative",
            LanguageCode: "es-MX",
            OutputFormat: "mp3",
            // LexiconNames
            Text: text,
            TextType: "ssml",
            VoiceId: "Mia"
        }

        const data = await Polly.synthesizeSpeech(input).promise();
        if (data.AudioStream instanceof Buffer) {
            // Guarda el audio en un archivo
            return data.AudioStream
        }
        return false

    } catch (error) {
        console.error('Error in textToMp3:', error);
        return false;
    }
}

async function textToMp3EL(message) {
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/oxuiIX7fqorTzndSBuQb`;
    const apiKey = '493714215943a4d6406ae658f70e0642'

    const requestData = {
        text: message,
        model_id: 'eleven_multilingual_v1',
        voice_settings: {
            stability: 0.80,
            similarity_boost: 0.92
        }
    }

    try {
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        })

        return response.data;

    } catch (error) {
        console.error('Error in textToMp3:', error);
        return false;
    }
}

function removeSpecialCharacters(text) {
    // Expresión regular para encontrar caracteres especiales
    var regex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/g;

    // Reemplazar los caracteres especiales con una cadena vacía
    var cleanedText = text.replace(regex, '');

    return cleanedText;
}

async function generateImage(text) {
    try {
        const requestImage = await openai.createImage({ prompt: removeSpecialCharacters(text), size: '512x512', n: 1 })
        return requestImage.data.data[0].url || ""
    } catch (err) {
        console.log(err)
        return false
    }
}

function firstTwoWordsAreImagine(text) {
    const palabras = text.trim().split(' ');
    if (palabras.length >= 2) {
        const primeraPalabra = palabras[0].toLowerCase();
        const segundaPalabra = palabras[1].toLowerCase();
        if (primeraPalabra === 'imagine') return true
        if (segundaPalabra === 'imagine') return true
        return false
    }
    return false;
}

module.exports = {
    textToMp3, convertToMP3, compliesForAudio, bufferToObj,
    firstTwoWordsAreImagine, generateImage, cleanTextWithEmojis, textToMp3EL, 
};


