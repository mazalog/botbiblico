const cors = require('cors');
const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, Location, List, Buttons, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const fs = require('fs');
const { convertToMP3, textToMp3, bufferToObj } = require('./utils/media');
const response = require('./book');
const { openai } = require('./utils/helper');

const app = express();
require("dotenv").config();
app.use(cors());

const PORT = process.env.PORT
app.listen(PORT, () => {
    console.log('LISTEN IN', PORT)
})

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        headless: true,
        // executablePath: '/usr/bin/google-chrome-stable',
    },
    // only add this property
    webVersionCache: {
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html',
        type: 'remote'
    }
});
client.initialize();
client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});
client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    qrcode.generate(qr, { small: true });
});
client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});
client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});
client.on('ready', () => {
    console.log('READY');
})
client.on('message', async msg => {

    if (msg.fromMe) {
        return null
    } else if (msg.id.participant) {
        console.log('msg is group')
    } else if (msg.type === 'image') {
        //Enviar esta imagen a un modelo de IA para que la analice. Se puede enviar un prompt en donde se defina un concepto 
        //Se envia al usuario la respuesta
        return null
    } else if (msg.type == 'ptt') {

        const media = await msg.downloadMedia();
        const str = media.mimetype;
        const regex = /\/(.+?);/;
        const match = str.match(regex);
        if (match && match[1]) {

            const audioToText = await convertToMP3(Buffer.from(media.data, 'base64'), msg.id.id)
            const chat = await msg.getChat();
            chat.sendStateTyping();

            if (audioToText) {
                if (audioToText) {
                    console.log('Entrada', audioToText)
                    const request = await response({
                        question: audioToText
                    })
                    console.log('Respuesta', request)
                    if (request) {
                        chat.sendMessage(request)
                    }
                }
            }

            fs.unlinkSync(`./audios/${msg.id.id}.ogg`);
            fs.unlinkSync(`./audios/${msg.id.id}mp3.mp3`);

        } else {
            console.log('No se encontró extension del archivo');
        }
    } else if (msg.body === '') {
        return null
    } else if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body === '!ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!echo')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!desc')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body === '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!join')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    } else if (msg.body === '!groupinfo') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body === '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    } else if (msg.body === '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
            *Connection info*
            User name: ${info.pushname}
            My number: ${info.wid.user}
            Platform: ${info.platform}
        `);
    } else if (msg.body === '!mediainfo' && msg.hasMedia) {
        const attachmentData = await msg.downloadMedia();
        msg.reply(`
            *Media info*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
    } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();

        quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);
    } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
        }
    } else if (msg.body === '!location') {
        msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    } else if (msg.location) {
        msg.reply(msg.location);
    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Status was updated to *${newStatus}*`);
    } else if (msg.body === '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hi @${contact.number}!`, {
            mentions: [contact]
        });
    } else if (msg.body === '!delete') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.fromMe) {
                quotedMsg.delete(true);
            } else {
                msg.reply('I can only delete my own messages');
            }
        }
    } else if (msg.body === '!pin') {
        const chat = await msg.getChat();
        await chat.pin();
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        await chat.archive();
    } else if (msg.body === '!mute') {
        const chat = await msg.getChat();
        // mute the chat for 20 seconds
        const unmuteDate = new Date();
        unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
        await chat.mute(unmuteDate);
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();
    } else if (msg.body === '!jumpto') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            client.interface.openChatWindowAt(quotedMsg.id._serialized);
        }
    } else if (msg.body === '!buttons') {
        let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
        console.log(msg.from)
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
        let list = new List('List body', 'btnText', sections, 'Title', 'footer');
        client.sendMessage(msg.from, list);
    } else if (msg.body === '!reaction') {
        msg.react('👍');
    } else {
        try {
            const chat = await msg.getChat();
            // simulates typing in the chat
            chat.sendStateTyping();
            console.log('Entrada', msg.body)
            const request = await response({
                question: msg.body
            })
            console.log('Respuesta', request)
            if (request) {


                // chat.sendMessage(request)


                const mp3 = await textToMp3(request)
                const object = await bufferToObj(mp3, 'audio')
                const message = new MessageMedia(object.mimetype, object.data, object.filename, object.filesize)
                client.sendMessage(message, { sendAudioAsVoice: true })




            }
        } catch (err) {
            console.log(err)
        }
    }
});

app.get("/", express.json(), async (req, res) => {
    return res.status(200).send({ sucess: true })
})


