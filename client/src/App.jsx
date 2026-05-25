import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, PiggyBank, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

// If on laptop, use localhost. If on Vercel, use the relative path.
const API_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:5000/api/transactions' 
  : '/api/transactions';

const CATEGORIES = [
  "Rent", "Food", "Transport", "Utilities", "Entertainment", 
  "Shopping", "Health", "Education", "Investments", "Others"
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  
  const [view, setView] = useState('Daily');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const showFeedback = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(API_URL, { title, amount: Number(amount), category, date });
    setTitle(''); setAmount('');
    fetchData();
    showFeedback("Transaction Saved! 🌿");
  };

  const confirmDelete = (id) => setDeleteModal({ show: true, id });

  const handleDelete = async () => {
    await axios.delete(`${API_URL}/${deleteModal.id}`);
    setDeleteModal({ show: false, id: null });
    fetchData();
    showFeedback("Entry Deleted 🍂");
  };

  // --- FIXED CHART LOGIC ---
  const getChartData = () => {
    // 1. Sort transactions from oldest to newest so the chart flows correctly
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Group them by Date or Month
    const groups = sortedTx.reduce((acc, tx) => {
      const d = new Date(tx.date);
      const key = view === 'Daily' 
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) 
        : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      
      acc[key] = (acc[key] || 0) + tx.amount;
      return acc;
    }, {});
    
    // 3. Convert to Array for Recharts
    return Object.keys(groups).map(k => ({ date: k, total: groups[k] }));
  };

  const totalSpent = transactions.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="dashboard">
      {/* Toast Notification */}
      {toast.show && <div className="toast"><CheckCircle size={18} /> {toast.msg}</div>}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Record?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setDeleteModal({show:false, id:null})}>Cancel</button>
              <button className="btn-confirm" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="left-side">
        <div className="brand">
          <PiggyBank size={32} color="#4b633a" strokeWidth={2.5} />
          <h1>SpendWise</h1>
        </div>

        <div className="summary-card">
          <span>TOTAL EXPENSES</span>
          <h2>₹{totalSpent.toLocaleString()}</h2>
        </div>

        <section className="card compact">
          <h4 className="card-title">ENTRY</h4>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>TITLE (DESCRIPTION)</label>
              <input type="text" placeholder="e.g. Electricity Bill" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            
            <div className="row">
              <div className="field">
                <label>PRICE (₹)</label>
                <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="field">
                <label>CATEGORY</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>DATE</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            
            {/* TEXT UPDATED HERE */}
            <button type="submit" className="btn-save">Add Transaction</button>
          </form>
        </section>

        <section className="card analysis compact">
          <div className="flex-row">
            <h4 className="card-title">ANALYSIS</h4>
            <div className="toggle">
              <button type="button" className={view === 'Daily' ? 'active' : ''} onClick={() => setView('Daily')}>D</button>
              <button type="button" className={view === 'Monthly' ? 'active' : ''} onClick={() => setView('Monthly')}>M</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={getChartData()}>
              <XAxis dataKey="date" hide />
              {/* TOOLTIP FIXED HERE */}
              <Tooltip 
                labelStyle={{ color: '#bc6c25', fontWeight: 'bold', marginBottom: '5px' }}
                contentStyle={{ background:'#582f0e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px' }}
                formatter={(value) => [`₹${value}`, 'Total']}
              />
              <Area type="monotone" dataKey="total" stroke="#606c38" fill="#606c38" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      </div>

      <main className="right-side"> 
        <div className="history-header">
          <h4 className="card-title">HISTORY</h4>
        </div>
        <div className="history-list">
          {transactions.map(tx => (
            <div key={tx._id} className="history-card">
              <div className="tx-date">{new Date(tx.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</div>
              <div className="tx-info">
                <div className="tx-cat-badge">{tx.category}</div>
                <h5>{tx.title}</h5>
              </div>
              <div className="tx-price">
                <span>₹{tx.amount}</span>
                <button onClick={() => confirmDelete(tx._id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;