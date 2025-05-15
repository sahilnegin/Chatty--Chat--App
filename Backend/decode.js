const jwt = require("jsonwebtoken");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIxZGI0ODU2MzI2ZWZiYzU1MzJiNDgiLCJpYXQiOjE3NDcwNTYwMzYsImV4cCI6MTc0NzA1OTYzNn0.6Mg5e5RJNvtGSADa6dEsBrYA9z95sA5p774BKh-Xs4c";
const secret = "chat-room1921";

try {
  const decoded = jwt.verify(token, secret);
  console.log("✅ Valid token:", decoded);
} catch (err) {
  console.error("❌ Invalid token:", err.message);
}
