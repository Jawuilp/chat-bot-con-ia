const socket = io();

document.getElementById('send-btn').addEventListener('click', () => {
    const userInput = document.getElementById('user-input').value;
    if (userInput) {
        displayMessage(userInput, 'user');
        socket.emit('user_message', userInput); // Enviar mensaje del usuario al servidor
        document.getElementById('user-input').value = ''; // Limpiar el campo de texto
    }
});

socket.on('bot_message', (message) => {
    displayMessage(message, 'bot'); // Mostrar respuesta del bot
});

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Desplazar hacia abajo al añadir un nuevo mensaje
}
