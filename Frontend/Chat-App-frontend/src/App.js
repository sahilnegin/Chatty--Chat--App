"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
require("./App.css");
function App() {
    const [message, setmessage] = (0, react_1.useState)(['Hello world']);
    const wsref = (0, react_1.useRef)();
    const inputref = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket("ws://localhost:8080");
        ws.onmessage = (event) => {
            setmessage((m) => [...m, event.data]);
        };
        wsref.current = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "join",
                payload: {
                    roomId: "red"
                }
            }));
        };
        return () => {
            ws.close();
        };
    }, []);
    const sendMessage = () => {
        var _a, _b;
        const msg = (_a = inputref.current) === null || _a === void 0 ? void 0 : _a.value;
        if (msg && ((_b = wsref.current) === null || _b === void 0 ? void 0 : _b.readyState) === WebSocket.OPEN) {
            wsref.current.send(JSON.stringify({
                type: "chat",
                payload: {
                    message: msg
                }
            }));
            inputref.current.value = ""; // clear input
        }
    };
    return (<div className='h-screen bg-black'>
      <br /><br /><br />
      <div className='h-[85vh] overflow-y-auto'>
        {message.map((msg, index) => (<div key={index} className='m-8'>
            <span className='bg-white text-black rounded p-4'>
              {msg}
            </span>
          </div>))}
      </div>

      <div className='w-full bg-white flex p-4'>
        <input ref={inputref} type="text" placeholder='Enter Your Message here' className='bg-white flex-1 text-black px-2'/>
        <button className='bg-purple-600 text-white rounded-2xl px-4 ml-2' onClick={sendMessage}>
          Send Message
        </button>
      </div>
    </div>);
}
exports.default = App;
