import React from 'react'
// import TypewriterText from './components/TypewriterText';
import Register from '../pages/register'
import Signin from '../pages/signin'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 shadow-lg px-8 py-5 flex justify-between items-center">

      <div className="text-white text-3xl font-extrabold tracking-wide drop-shadow-sm">
        Chatty
      </div>


      <div className="flex space-x-4 sm:space-x-6">
      <Link
  to="/login"
  className="bg-white text-blue-600 font-semibold px-5 py-2 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ease-in-out"
>
  Login
</Link>
        <Link
        to="/Signup"
          href="/register"
          className="bg-white/10 text-white border border-white px-5 py-2 rounded-full font-semibold backdrop-blur-md hover:bg-white/20 hover:scale-105 transition-all duration-200 ease-in-out"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  )
}
