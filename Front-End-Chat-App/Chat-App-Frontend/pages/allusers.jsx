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
  const [chatMessages, setChatMessages] = useState([]);

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

    fetchUsers();

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
    } catch (error) {
      toast.error('Something went wrong while loading messages');
    }
  };

  const handleSendMessage = (message) => {
    if (socket && activeUser) {
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
    }
  };

  if (loading) return <p className="text-center text-xl text-gray-500">Loading users...</p>;
  if (message) return <p className="text-center text-xl text-red-500">{message}</p>;

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8">
      <div className="w-1/4 max-h-screen overflow-y-auto bg-white p-6 rounded-l-xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Users</h2>
        <div className="flex flex-col gap-4">
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
      </div>

      <div className="w-3/4 max-h-screen bg-white p-6 rounded-r-xl shadow-xl flex flex-col">
        {activeUser ? (
          <>
            <h3 className="text-2xl font-bold text-center mb-4">Chat with {activeUser.name}</h3>
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
              <div className="flex gap-4 items-center">
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
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xl text-center text-gray-500">Select a user to start chatting</p>
        )}
      </div>
    </div>
  );
};

export default AllUsers;
