require('dotenv').config({ path: '.env.local' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { handleSendMessage } = require('./lib/socketController');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer);
    global.io = io;

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        // NEW: Secure Message Handling (Bypasses HTTP)
        socket.on('send_message_secure', (data, callback) => {
            handleSendMessage(socket, io, data, callback);
        });

        // Legacy/Client-Relay (For compatibility)
        socket.on('send_message', (data) => {
            const { room, message } = data;
            if (room && message) {
                // broadcast to everyone in the room except the sender
                socket.to(room).emit('receive_message', message);
            }
        });

        socket.on('disconnect', () => {
            // console.log('Client disconnected');
        });
    });

    httpServer.once('error', (err) => {
        console.error(err);
        process.exit(1);
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
