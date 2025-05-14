import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState(['Hello world']);
  const wsref = useRef<WebSocket | null>(null);
  const inputref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080"); // use ws:// not https:// for WebSocket

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        payload: { roomId: "red" }
      }));
    };

    wsref.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = () => {
    const message = inputref.current?.value;
    if (!message || !wsref.current || wsref.current.readyState !== WebSocket.OPEN) return;

    wsref.current.send(JSON.stringify({
      type: "chat",
      payload: { message }
    }));

    inputref.current.value = ''; // Clear input field after sending
  };

  return (
    <div className='h-screen bg-black text-white flex flex-col'>
      <div className='flex-1 overflow-y-auto p-4'>
        {messages.map((msg, idx) => (
          <div key={idx} className='my-2'>
            <span className='bg-white text-black rounded p-2 inline-block'>{msg}</span>
          </div>
        ))}
      </div>

      <div className='p-4 bg-white flex gap-2'>
        <input
          ref={inputref}
          type="text"
          placeholder='Enter your message...'
          className='flex-1 p-2 rounded border border-gray-300 text-black'
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          className='bg-purple-600 text-white px-4 py-2 rounded'
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
