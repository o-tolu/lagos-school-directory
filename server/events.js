// Server-Sent Events hub: pushes every data change to all open browser tabs / devices.
const clients = new Set();

export function addClient(res) {
    clients.add(res);
    res.on('close', () => clients.delete(res));
}

export function broadcast(event) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) res.write(payload);
}

// Keep idle connections alive through proxies.
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref();
