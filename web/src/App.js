import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();
// const socket = {
//   t: null,
//   emit: (event, value) => {
//     console.log('emit', event, value);
//     const handler = socket.handlers[event];
//     if (handler) return handler(value);

//     switch (event) {
//       case 'start':
//         const { duration = 0 } = value;
//         const end = new Date(new Date().getTime() + duration);

//         console.log('setting end to', end, duration);
//         clearInterval(socket.t);
//         socket.t = setInterval(() => {
//           const now = new Date();
//           if (end < now) {
//             return socket.emit('stop');
//           }
//           socket.emit('started', {
//             duration: end - now,
//           });
//         }, 250);
//         return;
//       case 'stop':
//         clearInterval(socket.t);
//         socket.emit('stopped');
//         return;
//       default:
//         return;
//     }
//   },
//   handlers: {},
//   on: (event, handler) => {
//     console.log('on', event, handler);
//     socket.handlers[event] = handler;
//   },
//   off: () => {},
// };
const start = (seconds) => {
  socket.emit('start', { duration: seconds * 1000 });
};

function PumpStatus({ isOn = false, duration = 0 }) {
  if (isOn) {
    const [minutes, seconds] = [
      Math.floor(duration / 1000 / 60),
      Math.floor(duration / 1000) % 60,
    ];
    return (
      <p>
        Pump is on for {minutes}m{seconds}s<div className="pump-on">💦</div>
      </p>
    );
  }
  return (
    <p>
      Pump is off <div className="pump-off">💤</div>
    </p>
  );
}

function App() {
  const [isOn, setIsOn] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(null);
  const durationEl = useRef(null);
  useEffect(() => {
    socket.on('started', ({ duration }) => {
      setIsOn(true);
      setRemainingDuration(duration);
    });
    socket.on('stopped', () => {
      setIsOn(false);
    });

    return () => socket.off();
  });

  return (
    <div className="App">
      <header>cat waterer</header>
      <main>
        <section className="pump-status">
          <PumpStatus isOn={isOn} duration={remainingDuration} />
        </section>
        <section className="pump-controls">
          <label htmlFor="seconds">
            Run pump for
            <input
              ref={durationEl}
              type="number"
              id="seconds"
              min="1"
              defaultValue={300}
            />
            seconds
          </label>
          <button onClick={() => start(durationEl.current.value)}>Start</button>
        </section>
      </main>
      <footer>Made with love for Rufus</footer>
    </div>
  );
}

export default App;
