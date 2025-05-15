// src/App.jsx
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/Homepage';
import Register from '../pages/register';
import Signin from '../pages/signin';
import AllUsers from '../pages/allusers';


function App() {
  return (
    <>
      {/* <HomePage/> */}
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/login" element={<Signin />} />
        <Route path="/Signup" element={<Register />} />
        <Route path="/AllUsers" element={<AllUsers/>}/>
        </Routes>
    </>
  );
}

export default App;
