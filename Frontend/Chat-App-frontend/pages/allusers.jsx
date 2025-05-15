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
            'Authorization': `Bearer ${token}`,
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const messages = await response.json();
        const formattedMessages = messages.map(msg => ({
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
        'Authorization': `Bearer ${token}`,
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


  if (loading) return <p className="text-center text-xl text-gray-500">Loading users...</p>;
  if (message) return <p className="text-center text-xl text-red-500">{message}</p>;

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8">
      <div className="w-1/4 max-h-screen overflow-y-auto bg-white p-6 rounded-l-xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Users</h2>
        <div className="flex flex-col gap-4 mb-8">
          {users.map((user) => (
            
            <div
              key={user._id || user.id}
              onClick={() => handleClickUser(user._id || user.id, user.name)}
              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300"
            >
              {user.name}
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">Rooms</h2>
        <div className="flex flex-col gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleJoinRoom(room.id)}
              className="cursor-pointer bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300"
            >
              {room.name}
            </div>
          ))}
        </div>
      </div>

      <div className="w-3/4 max-h-screen bg-white p-6 rounded-r-xl shadow-xl flex flex-col">
        {(activeUser || activeRoom) ? (
          <>
            <h3 className="text-2xl font-bold text-center mb-4">
              Chat with {activeUser ? activeUser.name : activeRoom.name}
            </h3>
            <div className="flex flex-col gap-4 mb-4 flex-1 overflow-auto">
              <div className="h-72 overflow-auto p-4 bg-gray-100 rounded-lg border border-gray-300 shadow-inner">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-2">
                    <strong className={`text-${msg.from === 'You' ? 'green' : 'blue'}-600`}>
                      {msg.from}:
                    </strong>{' '}
                    {msg.message} <span className="text-gray-400 text-xs">({msg.timestamp})</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
<div className="flex gap-4 items-center">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6 text-gray-600">
    <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
  </svg>
  
  <input
    type="text"
    placeholder="Type a message"
    className="flex-1 p-4 border border-gray-300 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        handleSendMessage(e.target.value);
        e.target.value = '';
      }
    }}
  />
  
  <button
    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-lg shadow-md"
    onClick={(e) => {
      const input = e.target.previousElementSibling;
      handleSendMessage(input.value);
      input.value = '';
    }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
</svg>

  </button>
</div>


                {activeUser && (
                  <input
                    type="file"
                    className="text-sm"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xl text-center text-gray-500">Select a user or room to start chatting</p>
        )}
      </div>
    </div>
  );
};

export default AllUsers;
