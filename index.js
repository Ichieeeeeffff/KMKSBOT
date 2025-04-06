const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3000;

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
        ],
    },
});

// Ketika QR code dihasilkan
client.on('qr', (qr) => {
    console.log('QR Code diterima, menampilkan di terminal...');
    qrcodeTerminal.generate(qr, { small: true });
});

// Ketika client siap
client.on('ready', () => {
    console.log('Client is ready!');
});

// Ketika client terputus
client.on('disconnected', (reason) => {
    console.log('Client terputus:', reason);
});

// Inisialisasi client
client.initialize();

// Endpoint untuk mengirim pesan WhatsApp
app.post('/send-whatsapp', async (req, res) => {
    const { target, message, qrUrl } = req.body;

    if (!target || !message || !qrUrl) {
        return res.status(400).json({ status: 'error', message: 'Target, message, dan qrUrl wajib diisi.' });
    }

    try {
        const qrImagePath = './user-qrcode.png';
        const response = await fetch(qrUrl);
        const fileStream = fs.createWriteStream(qrImagePath);
        response.body.pipe(fileStream);

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        const chatId = target.includes('@c.us') ? target : `${target}@c.us`;
        await client.sendMessage(chatId, message);

        const media = MessageMedia.fromFilePath(qrImagePath);
        await client.sendMessage(chatId, media, { caption: 'Ini adalah QR Code Anda.' });

        fs.unlinkSync(qrImagePath);

        res.json({ status: 'success', message: 'Pesan dan QR Code berhasil dikirim.' });
    } catch (error) {
        console.error('Gagal mengirim pesan:', error);
        res.status(500).json({ status: 'error', message: 'Gagal mengirim pesan WhatsApp.' });
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running!');
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});