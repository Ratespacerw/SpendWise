const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// @route   GET /api/transactions
// @desc    Get all transactions (Sorted by newest first)
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// @route   POST /api/transactions
// @desc    Add a new transaction   
router.post('/', async (req, res) => {
    try {
        const { title, amount, category, date } = req.body;
        const newTransaction = new Transaction({ title, amount, category, date });

        await newTransaction.save(); 
        res.status(201).json(newTransaction); 
        
    } catch (err) {
        console.error("Error happened:", err.message);
        res.status(500).json({ message: "Failed to save", error: err.message });
    }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a specific transaction using its ID
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        await transaction.deleteOne();
        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting transaction", error: err.message });
    }
});

module.exports = router;