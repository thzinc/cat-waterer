const express = require('express');
const path = require('path');
const fs = require('fs');
const Color = require('color');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

/*
[starting]------[running]--------[ending]
ramp up color   fluctuate        ramp down
ramp up motor   full             ramp down
*/

const states = {
  starting: {
    duration: 3000,
    transitions: [
      { lights: '#000000', pump: 0 },
      { lights: '#000099', pump: 1 },
      { lights: '#3355FF', pump: 1 },
    ],
  },
  running: {
    duration: 2000,
    transitions: [
      { lights: '#3355FF', pump: 1 },
      { lights: '#CCCCFF', pump: 1 },
    ],
  },
  ending: {
    duration: 3000,
    transitions: [
      { lights: '#3355FF', pump: 1 },
      { lights: '#000099', pump: 0 },
      { lights: '#000000', pump: 0 },
    ],
  },
};
let state = null;
let epoch = null;
const FPS = 5;
const delay = 1000 / FPS;
const piBlaster = '/dev/pi-blaster';
let int = null;
const pins = {
  R: 17,
  G: 27,
  B: 22,
  Pump: 23,
};
function start() {
  if (int) clearInterval(int);
  if (!state || state === 'ending') {
    state = 'starting';
    epoch = new Date().getTime();
  }

  int = setInterval(() => {
    if (!state) {
      clearInterval(int);
    }

    const now = new Date().getTime();
    let elapsed = now - epoch;
    const { duration, transitions } = states[state];
    if (duration < elapsed) {
      switch (state) {
        case 'starting':
          state = 'running';
          epoch = now;
          return;
        case 'ending':
          state = null;
          epoch = null;
          clearInterval(int);
          elapsed = duration - 1; // HACK
          break;
        default:
          break;
      }
    }
    const progress = (elapsed % duration) / duration;
    const maxIndex = transitions.length - 1;
    const curr = progress * maxIndex;
    const mix = curr % 1;
    const [from, to] = [
      transitions[Math.floor(curr)],
      transitions[Math.ceil(curr)],
    ];
    const lights = Color(from.lights).mix(Color(to.lights), mix);
    const pump = from.pump + (to.pump - from.pump) * mix;
    const [r, g, b] = lights.rgb().array();
    const [rp, gp, bp] = [r / 255, g / 255, b / 255];
    const values = [
      `${pins.Pump}=${pump.toFixed(2)}`,
      `${pins.R}=${rp.toFixed(2)}`,
      `${pins.G}=${gp.toFixed(2)}`,
      `${pins.B}=${bp.toFixed(2)}`,
    ].join(' ');
    console.log(values);
    fs.writeFileSync(piBlaster, values, console.log);
  }, delay);
}

function stop() {
  state = 'ending';
  epoch = new Date().getTime();
}

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

  start();
  io.sockets.emit('started', { duration: end - now });
};

io.on('connection', (socket) => {
  const now = new Date();
  if (!end || end < now) {
    socket.emit('stopped');
  }
  socket.on('start', ({ duration }) => {
    clearInterval(i);
    end = new Date(new Date().getTime() + duration);
    i = setInterval(counter, 250);
  });
  socket.on('stop', () => {
    end = new Date();
  });
});

http.listen(9000);
