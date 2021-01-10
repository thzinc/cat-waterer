import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();
const start = (seconds) => {
  socket.emit('start', { duration: seconds * 1000 });
};

function PumpStatus({ isConnected = false, isOn = false, duration = 0 }) {
  if (!isConnected) {
    return (
      <p>
        Not connected <div className="pump-disconnected">🔌</div>
      </p>
    );
  }
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
  const [isConnected, setIsConnected] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(null);
  const durationEl = useRef(null);
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
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
      <header>Cat Waterer</header>
      <main>
        <section className="pump-status">
          <PumpStatus
            isConnected={isConnected}
            isOn={isOn}
            duration={remainingDuration}
          />
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
      <footer>Made with ♥️ for Rufus 😻</footer>
    </div>
  );
}

export default App;
