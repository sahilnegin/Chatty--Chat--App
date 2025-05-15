import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AllUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/allusers', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        if (response.ok) {
          setUsers(result.users || result);
        } else {
          setMessage(result.error || 'Failed to load users');
        }
      } catch (error) {
        setMessage('An error occurred while fetching users.');
      } finally {
        setLoading(false);
      }
    };

    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/rooms', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (response.ok) {
          setRooms(result.rooms || []);
        }
      } catch {}
    };

    fetchUsers();
    fetchRooms();

    const ws = new WebSocket(`ws://localhost:5000/?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'private') {
        const sender = data.payload.from;
        toast.info(`New message from ${sender}: ${data.payload.message}`, {
          position: 'top-right',
          autoClose: 3000,
        });
        setChatMessages((prevMessages) => [
          ...prevMessages,
          {
            from: sender,
            message: data.payload.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (data.type === 'room') {
        setChatMessages((prevMessages) => [
          ...prevMessages,
          {
            from: data.payload.from,
            message: data.payload.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (data.type === 'error') {
        console.error(data.message);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [navigate]);

  const handleClickUser = async (userId, name) => {
    setActiveUser({ userId, name });
    setActiveRoom(null);
    setChatMessages([]);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:5000/api/messages/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const messages = await response.json();
        const formattedMessages = messages.map((msg) => ({
          from: msg.sender === userId ? name : 'You',
          message: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString(),
        }));
        setChatMessages(formattedMessages);
      } else {
        toast.error('Failed to load chat history');
      }
    } catch {
      toast.error('Something went wrong while loading messages');
    }
  };

  const handleJoinRoom = (roomId) => {
    const room = rooms.find((room) => room.id === roomId);
    if (room) {
      setActiveRoom(room);
      setActiveUser(null);
      setChatMessages([]);
    }
  };

  const handleSendMessage = (message) => {
    if (!message.trim()) return;

    if (socket) {
      if (activeUser) {
        const payload = {
          type: 'private',
          payload: {
            toUserId: activeUser.userId,
            message,
          },
        };
        socket.send(JSON.stringify(payload));
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { from: 'You', message, timestamp: new Date().toLocaleTimeString() },
        ]);
      } else if (activeRoom) {
        const payload = {
          type: 'room',
          roomId: activeRoom.id,
          payload: { message },
        };
        socket.send(JSON.stringify(payload));
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { from: 'You', message, timestamp: new Date().toLocaleTimeString() },
        ]);
      }
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !activeUser) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`http://localhost:5000/api/upload/${activeUser.userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('File sent successfully');
        setChatMessages((prev) => [
          ...prev,
          {
            from: 'You',
            message: `📎 Sent file: ${file.name}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        toast.error('Failed to send file');
      }
    } catch (err) {
      toast.error('Something went wrong while uploading the file');
      console.error(err);
    }
  };

  if (loading) return <p className="text-center text-xl text-gray-400 mt-24">Loading users...</p>;
  if (message) return <p className="text-center text-xl text-red-600 mt-24">{message}</p>;

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 p-8 font-sans text-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-800 rounded-2xl shadow-2xl p-6 flex flex-col">
        <h2 className="text-4xl font-extrabold text-center mb-8 tracking-wide drop-shadow-lg">
          Team Chat
        </h2>

        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 border-b border-purple-700 pb-2 uppercase tracking-wide">
            Users
          </h3>
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-700">
            {users.map((user) => (
              <li
                key={user._id || user.id}
                onClick={() => handleClickUser(user._id || user.id, user.name)}
                className={`cursor-pointer rounded-lg px-4 py-3 transition-colors duration-300 ${
                  activeUser?.userId === (user._id || user.id)
                    ? 'bg-purple-600 shadow-lg'
                    : 'hover:bg-purple-700'
                }`}
                title={user.email || ''}
              >
                {user.name}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 border-b border-green-600 pb-2 uppercase tracking-wide">
            Rooms
          </h3>
          <ul className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-700">
            {rooms.map((room) => (
              <li
                key={room.id}
                onClick={() => handleJoinRoom(room.id)}
                className={`cursor-pointer rounded-lg px-4 py-3 transition-colors duration-300 ${
                  activeRoom?.id === room.id ? 'bg-green-600 shadow-lg' : 'hover:bg-green-700'
                }`}
                title={room.description || ''}
              >
                {room.name}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Chat Section */}
      <section className="flex-1 bg-white rounded-2xl shadow-2xl flex flex-col p-6">
        {(activeUser || activeRoom) ? (
          <>
            <header className="mb-6 border-b border-gray-300 pb-3">
              <h3 className="text-3xl font-bold text-gray-900">
                Chat with <span className="text-indigo-600">{activeUser ? activeUser.name : activeRoom.name}</span>
              </h3>
            </header>

            <div className="flex flex-col flex-1 overflow-hidden rounded-lg border border-gray-300 shadow-inner bg-gray-50 p-6">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-gray-200 pr-2">
                {chatMessages.length === 0 && (
                  <p className="text-center text-gray-400 mt-12">No messages yet. Say hi!</p>
                )}
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`max-w-[70%] px-4 py-2 rounded-2xl relative shadow ${
                      msg.from === 'You'
                        ? 'bg-indigo-600 text-white ml-auto rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <div className="font-semibold mb-1">{msg.from}</div>
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                    <time className="block text-xs text-gray-400 mt-1 text-right">
                      {msg.timestamp}
                    </time>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = e.target.messageInput.value;
                  handleSendMessage(message);
                  e.target.messageInput.value = '';
                }}
                className="flex items-center gap-4"
              >
                <input
                  id="messageInput"
                  name="messageInput"
                  type="text"
                  autoComplete="off"
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-gray-300 px-5 py-3 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-3 shadow-lg transition"
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.752 11.168l-9.692-3.175a.75.75 0 01.955-1.019l14.943 7.24a.75.75 0 010 1.338l-14.943 7.24a.75.75 0 01-.955-1.02l9.692-3.176"
                    />
                  </svg>
                </button>
              </form>

              {/* File Upload */}
              {activeUser && (
                <div className="mt-4">
                  <label
                    htmlFor="fileUpload"
                    className="cursor-pointer inline-block text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    📎 Attach file
                  </label>
                  <input
                    type="file"
                    id="fileUpload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400 text-xl font-medium select-none">
            Select a user or room to start chatting
          </div>
        )}
      </section>
    </div>
  );
};

export default AllUsers;
