const fs = require('fs');
const Color = require('color');

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
const piBlaster = process.env.PI_BLASTER || '/dev/pi-blaster';
let int = null;
const pins = {
  R: process.env.PIN_R || '17',
  G: process.env.PIN_G || '27',
  B: process.env.PIN_B || '22',
  Pump: process.env.PIN_PUMP || '23',
};
module.exports.start = () => {
  console.log('starting');
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
    fs.writeFileSync(piBlaster, values, console.log);
  }, delay);
};

module.exports.stop = () => {
  console.log('stopping');
  state = 'ending';
  epoch = new Date().getTime();
};