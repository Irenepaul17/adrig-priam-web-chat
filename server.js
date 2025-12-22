const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

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

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        socket.on('send_message', (data) => {
            // data should contain { room, message } or just the message object if room is inferred
            // Assuming data includes room target or we rely on conversation ID
            const { room, message } = data;
            if (room && message) {
                // broadcast to everyone in the room except the sender (optional, or include sender)
                // usually we want to include sender if we optimize optimistic UI, but here we just broadcast to others
                // for simplicity, let's broadcast to everyone in the room including sender if they need confirmation,
                // OR use socket.to(room).emit to exclude sender.
                // The existing frontend appends locally on success, so we might want to avoid duplicates.
                // Let's use socket.to(room).emit to exclude the sender.
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
