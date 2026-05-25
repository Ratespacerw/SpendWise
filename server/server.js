const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const transactionRoutes = require('./routes/transactions');

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

 
const PORT = process.env.PORT || 5000;
app.use('/api/transactions', transactionRoutes);
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));