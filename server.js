import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Importamos el paquete de Google Generative AI
import dotenv from 'dotenv';

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

// Inicializar Google Generative AI con la API Key desde el archivo .env
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Configuración de Express y Socket.io
const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server);

// API de WhatsApp (mantener si ya la tienes configurada)
const whatsappToken = 'YOUR_WHATSAPP_ACCESS_TOKEN'; // Reemplázala con tu token de acceso de WhatsApp
const whatsappPhoneId = 'YOUR_WHATSAPP_PHONE_NUMBER_ID'; // Reemplázala con tu ID de número de WhatsApp

// Sirve los archivos estáticos (HTML, CSS, JS) para la interfaz web
app.use(express.static('public'));

// Función para obtener respuesta del bot usando Google Generative AI
async function getBotResponse(userMessage) {
    try {
        // Obtener el modelo de generación (puedes usar otro modelo si prefieres)
        const model = genAI.getGenerativeModel({ model: "tunedModels/tunig-v1-j7ujrombb64s" });

        // Generar contenido con el mensaje del usuario como prompt
        const result = await model.generateContent(userMessage);
        
        // Retornar la respuesta generada por el modelo
        return result.response.text().trim();
    } catch (error) {
        console.error('Error al obtener respuesta de Google Generative AI:', error);
        return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
}

// Manejo de conexión de socket.io (interfaz web)
io.on('connection', (socket) => {
    console.log('Nuevo cliente web conectado');

    socket.on('user_message', async (message) => {
        console.log('Mensaje del usuario (Web): ', message);
        
        // Obtener la respuesta del bot
        const botMessage = await getBotResponse(message);

        // Enviar la respuesta de vuelta al cliente web
        socket.emit('bot_message', botMessage);
    });

    socket.on('disconnect', () => {
        console.log('Cliente web desconectado');
    });
});

// Manejo de mensajes de WhatsApp (webhook)
app.post('/webhook', async (req, res) => {
    const message = req.body.entry[0].changes[0].value.messages[0];
    const phoneNumber = message.from; // Número de teléfono del usuario
    const userMessage = message.text.body; // Mensaje del usuario

    console.log('Mensaje del usuario (WhatsApp): ', userMessage);

    // Obtener respuesta del bot usando Google Generative AI
    const botMessage = await getBotResponse(userMessage);

    // Enviar la respuesta de vuelta al usuario en WhatsApp
    await sendWhatsappMessage(phoneNumber, botMessage);

    res.sendStatus(200); // Enviar respuesta OK a WhatsApp
});

// Función para enviar mensaje a través de la API de WhatsApp
async function sendWhatsappMessage(phoneNumber, botMessage) {
    try {
        await post(`https://graph.facebook.com/v13.0/${whatsappPhoneId}/messages`, {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            text: { body: botMessage },
        }, {
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Mensaje enviado a WhatsApp:', botMessage);
    } catch (error) {
        console.error('Error al enviar mensaje a WhatsApp:', error);
    }
}

// Verificar el webhook de WhatsApp (Meta requiere verificación de token)
app.get('/webhook', (req, res) => {
    const verifyToken = 'YOUR_VERIFY_TOKEN'; // Establece tu token de verificación
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === verifyToken) {
        console.log('Webhook verificado');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Iniciar servidor
const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
