const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const transactionRoutes = require('./routes/transactions');
const authRoutes = require('./routes/auth');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB")) 
  .catch((err) => console.log("❌ DB Error: ", err));

// Test Route
app.get('/', (req, res) => {
  res.send("FinTrack Server is Running!");
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}

// Always export the app so Vercel can use it
module.exports = app;
