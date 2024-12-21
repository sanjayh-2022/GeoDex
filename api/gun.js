import Gun from 'gun';
import http from 'http';

const server = http.createServer();

const gun = Gun({ web: server });

export default function handler(req, res) {
 
  if (req.url.includes('/gun')) {
    server.emit('request', req, res);
  } else {
    res.status(404).send('Not found');
  }
}

server.listen();
