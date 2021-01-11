const express = require('express');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { start, stop } = require('./gpio.js');

const port = process.env.PORT || 80;

app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

let end = null;
let i;
const counter = () => {
  const now = new Date();
  if (end && end < now) {
    clearInterval(i);
    stop();
    io.sockets.emit('stopped');
    return;
  }

  io.sockets.emit('started', { duration: end - now });
};

io.on('connection', (socket) => {
  const now = new Date();
  if (!end || end < now) {
    socket.emit('stopped');
  }
  socket.on('start', ({ duration }) => {
    clearInterval(i);
    start();
    end = new Date(new Date().getTime() + duration);
    i = setInterval(counter, 250);
  });
  socket.on('stop', () => {
    end = new Date();
  });
});

http.listen(port);
