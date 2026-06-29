const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Check if the frontend sent a token in the header
  const token = req.header('x-auth-token');

  // 2. If no token, access denied
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied. Please log in.' });
  }

  // 3. If there is a token, verify it's real and not faked
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    
    // 4. Attach the user's ID to the request so we know WHO is making the request
    req.user = decoded.user;
    next(); // "You may pass"
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};