const sseClients = new Set();

function broadcastSSE(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

function registerSSE(app) {
    app.get('/api/events', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write(':\n\n');

        sseClients.add(res);
        console.log(`SSE client connected (total: ${sseClients.size})`);

        req.on('close', () => {
            sseClients.delete(res);
            console.log(`SSE client disconnected (total: ${sseClients.size})`);
        });
    });
}

module.exports = { broadcastSSE, registerSSE };
