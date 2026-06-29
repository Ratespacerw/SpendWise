const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// @route   GET /api/transactions
// GET Route
router.get('/', auth, async (req, res) => {
    try {
        // ONLY fetch transactions that belong to the logged-in user!
        const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// POST Route
router.post('/', auth, async (req, res) => {
    try {
        const { title, amount, category, subCategory, date } = req.body;
        
        // Add the user's ID to the new transaction
        const newTransaction = new Transaction({ 
            title, amount, category, subCategory, date, 
            user: req.user.id // <-- Stamping the nametag!
        });

        await newTransaction.save(); 
        res.status(201).json(newTransaction); 
    } catch (err) {
        res.status(500).json({ message: "Failed to save" });
    }
});

// DELETE Route
router.delete('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        // Make sure the person deleting it actually owns it!
        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to delete this" });
        }

        await transaction.deleteOne();
        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting transaction" });
    }
});

module.exports = router;