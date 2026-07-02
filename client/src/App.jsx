import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, PiggyBank, CheckCircle, Lock, LogOut } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const BASE_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api';
const API_URL = `${BASE_URL}/transactions`;
const AUTH_URL = `${BASE_URL}/auth`;

const CATEGORIES = [
  "Rent", "Food", "Transport", "Utilities", "Entertainment", 
  "Shopping", "Health", "Education", "Investments", "Others"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

function App() {
  // --- AUTHENTICATION STATES ---
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // --- NAVIGATION TAB STATE ---
  const [activeTab, setActiveTab] = useState('Dashboard'); // 'Dashboard' or 'History'

  // --- PERIOD FILTER STATES (For Dashboard Visualizations) ---
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // --- DASHBOARD STATES ---
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState('');
  
  const [view, setView] = useState('Daily'); // 'Daily' (days in month) vs 'Monthly' (months in year)
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [logoutModal, setLogoutModal] = useState(false); // Logout confirmation modal state

  // --- AXIOS CONFIG (The JWT Token Header) ---
  const axiosConfig = {
    headers: { 'x-auth-token': token }
  };

  // --- AUTHENTICATION FUNCTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLoginView ? '/login' : '/register';
      const payload = isLoginView 
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };

      const res = await axios.post(`${AUTH_URL}${endpoint}`, payload);
      
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      
      showFeedback(isLoginView ? "Welcome Back! 🌿" : "Account Created! 🎉");
      
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      alert(err.response?.data?.message || "Authentication Failed");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setTransactions([]);
    setLogoutModal(false);
  };

  // --- TRANSACTION FUNCTIONS ---
  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await axios.get(API_URL, axiosConfig);
      setTransactions(res.data);
    } catch (err) { 
      if (err.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [token]);

  const showFeedback = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, { title, amount: Number(amount), category, subCategory, date }, axiosConfig);
      setTitle(''); 
      setAmount('');
      setSubCategory('');
      fetchData();
      showFeedback("Transaction Saved! 🌿");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save transaction");
    }
  };

  const confirmDelete = (id) => setDeleteModal({ show: true, id });

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteModal.id}`, axiosConfig);
      setDeleteModal({ show: false, id: null });
      fetchData();
      showFeedback("Entry Deleted 🍂");
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting transaction");
    }
  };

  // --- SUB-CATEGORY SUGGESTIONS ---
  const getSubCategorySuggestions = () => {
    if (!transactions || transactions.length === 0) return [];
    const suggestions = transactions
      .filter(tx => 
        tx.category === category && 
        tx.subCategory && 
        typeof tx.subCategory === 'string' && 
        tx.subCategory.trim() !== ''
      )
      .map(tx => tx.subCategory.trim());
    return [...new Set(suggestions)];
  };

  // --- AREA CHART LOGIC (Based on Period Filter Selection) ---
  const getChartData = () => {
    if (view === 'Daily') {
      // Days in the selected Month
      const filtered = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
      });
      const days = {};
      filtered.forEach(tx => {
        const day = new Date(tx.date).getDate();
        days[day] = (days[day] || 0) + tx.amount;
      });
      return Object.keys(days)
        .map(day => Number(day))
        .sort((a, b) => a - b)
        .map(day => ({
          date: `${day} ${MONTHS[filterMonth].substring(0, 3)}`,
          total: days[day]
        }));
    } else {
      // Months in the selected Year
      const filtered = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === filterYear;
      });
      const months = Array(12).fill(0).reduce((acc, _, idx) => {
        acc[idx] = 0;
        return acc;
      }, {});
      filtered.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        months[month] += tx.amount;
      });
      return Object.keys(months).map(mIdx => ({
        date: MONTHS[Number(mIdx)].substring(0, 3),
        total: months[mIdx]
      }));
    }
  };

  // --- PIE CHART DATA (Filtered dynamically by Period Filters) ---
  const getPieData = () => {
    if (!transactions || transactions.length === 0) return [];
    
    const filtered = transactions.filter(tx => {
      const d = new Date(tx.date);
      if (view === 'Daily') {
        // Month View: Filter by the selected month and year
        return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
      } else {
        // Year View: Filter by the entire selected year
        return d.getFullYear() === filterYear;
      }
    });

    const data = {};
    filtered.forEach(tx => {
      const key = tx.category;
      data[key] = (data[key] || 0) + tx.amount;
    });

    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  };

  const COLORS = ['#606c38', '#bc6c25', '#2d3a27', '#582f0e', '#dda15e', '#ccd5ae', '#457b9d', '#e63946', '#1d3557', '#3b3e43'];

  const colorFor = (name) => {
    const idx = CATEGORIES.indexOf(name);
    if (idx !== -1) return COLORS[idx];
    const othersIdx = CATEGORIES.indexOf('Others');
    return COLORS[othersIdx !== -1 ? othersIdx : COLORS.length - 1];
  };

  const totalSpent = transactions.reduce((acc, item) => acc + item.amount, 0);
  const pieData = getPieData();

  // --- CALCULATE ADVANCED INSIGHTS FOR SELECTED MONTH & YEAR ---
  const getPeriodInsights = () => {
    // ==========================================
    // 1. MONTHLY DATA & METRICS
    // ==========================================
    const currentMonthTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
    });

    const prevMonth = filterMonth === 0 ? 11 : filterMonth - 1;
    const prevYear = filterMonth === 0 ? filterYear - 1 : filterYear;
    const prevMonthTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    // Month Insight 1: Highest Cost Sub-category & Top 5 List
    const subCatTotals = {};
    currentMonthTxs.forEach(tx => {
      if (tx.subCategory) {
        const sub = tx.subCategory.trim();
        subCatTotals[sub] = (subCatTotals[sub] || 0) + tx.amount;
      }
    });

    let highestSubCat = "None";
    let highestSubCatAmount = 0;
    Object.entries(subCatTotals).forEach(([sub, amt]) => {
      if (amt > highestSubCatAmount) {
        highestSubCat = sub;
        highestSubCatAmount = amt;
      }
    });

    const sortedSubCats = Object.entries(subCatTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Month Insight 2: Top Category & Top 5 List
    const catTotals = {};
    currentMonthTxs.forEach(tx => {
      catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
    });

    let topCategory = "None";
    let topCategoryAmount = 0;
    Object.entries(catTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategory = cat;
        topCategoryAmount = amt;
      }
    });

    const sortedCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Month Insight 3: Previous Month Spending Comparison
    const currentTotal = currentMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const prevTotal = prevMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    let spendingComparisonText = "No comparative records for the previous month.";
    if (prevTotal > 0) {
      const percent = ((currentTotal - prevTotal) / prevTotal) * 100;
      spendingComparisonText = percent >= 0 
        ? `📈 Spending increased by ${percent.toFixed(1)}% compared to last month.`
        : `📉 Spending decreased by ${Math.abs(percent).toFixed(1)}% compared to last month.`;
    }

    // Month Insight 4: Highest Category shift
    const prevCatTotals = {};
    prevMonthTxs.forEach(tx => {
      prevCatTotals[tx.category] = (prevCatTotals[tx.category] || 0) + tx.amount;
    });

    let highestIncreaseCat = "None";
    let maxIncreaseDiff = 0;
    let highestDecreaseCat = "None";
    let maxDecreaseDiff = 0;

    const allCategories = new Set([...Object.keys(catTotals), ...Object.keys(prevCatTotals)]);
    allCategories.forEach(cat => {
      const currentVal = catTotals[cat] || 0;
      const prevVal = prevCatTotals[cat] || 0;
      const diff = currentVal - prevVal;
      if (diff > maxIncreaseDiff) {
        maxIncreaseDiff = diff;
        highestIncreaseCat = cat;
      } else if (diff < maxDecreaseDiff) {
        maxDecreaseDiff = diff;
        highestDecreaseCat = cat;
      }
    });

    // ==========================================
    // 2. YEARLY DATA & METRICS
    // ==========================================
    const currentYearTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === filterYear;
    });

    const prevYearTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === filterYear - 1;
    });

    // Year Insight 1: Highest Cost Sub-category & Top 5 List
    const yearSubCatTotals = {};
    currentYearTxs.forEach(tx => {
      if (tx.subCategory) {
        const sub = tx.subCategory.trim();
        yearSubCatTotals[sub] = (yearSubCatTotals[sub] || 0) + tx.amount;
      }
    });

    let highestYearSubCat = "None";
    let highestYearSubCatAmount = 0;
    Object.entries(yearSubCatTotals).forEach(([sub, amt]) => {
      if (amt > highestYearSubCatAmount) {
        highestYearSubCat = sub;
        highestYearSubCatAmount = amt;
      }
    });

    const sortedYearSubCats = Object.entries(yearSubCatTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Year Insight 2: Top Category & Top 5 List
    const yearCatTotals = {};
    currentYearTxs.forEach(tx => {
      yearCatTotals[tx.category] = (yearCatTotals[tx.category] || 0) + tx.amount;
    });

    let topYearCategory = "None";
    let topYearCategoryAmount = 0;
    Object.entries(yearCatTotals).forEach(([cat, amt]) => {
      if (amt > topYearCategoryAmount) {
        topYearCategory = cat;
        topYearCategoryAmount = amt;
      }
    });

    const sortedYearCategories = Object.entries(yearCatTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Year Insight 3: YoY Spending Comparison
    const totalYearSpent = currentYearTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPrevYearSpent = prevYearTxs.reduce((sum, tx) => sum + tx.amount, 0);

    let yoyChangeText = "No comparative records for the previous year.";
    if (totalPrevYearSpent > 0) {
      const percent = ((totalYearSpent - totalPrevYearSpent) / totalPrevYearSpent) * 100;
      yoyChangeText = percent >= 0 
        ? `📈 Spending is UP by ${percent.toFixed(1)}% compared to ${filterYear - 1}.`
        : `📉 Spending is DOWN by ${Math.abs(percent).toFixed(1)}% compared to ${filterYear - 1}.`;
    }

    // Year Insight 4: YoY Category Shifts
    const prevYearCatTotals = {};
    prevYearTxs.forEach(tx => {
      prevYearCatTotals[tx.category] = (prevYearCatTotals[tx.category] || 0) + tx.amount;
    });

    let highestIncreaseYearCat = "None";
    let maxIncreaseYearDiff = 0;
    let highestDecreaseYearCat = "None";
    let maxDecreaseYearDiff = 0;

    const allYearCategories = new Set([...Object.keys(yearCatTotals), ...Object.keys(prevYearCatTotals)]);
    allYearCategories.forEach(cat => {
      const currentVal = yearCatTotals[cat] || 0;
      const prevVal = prevYearCatTotals[cat] || 0;
      const diff = currentVal - prevVal;
      if (diff > maxIncreaseYearDiff) {
        maxIncreaseYearDiff = diff;
        highestIncreaseYearCat = cat;
      } else if (diff < maxDecreaseYearDiff) {
        maxDecreaseYearDiff = diff;
        highestDecreaseYearCat = cat;
      }
    });

    return {
      // Monthly Returns
      highestSubCat,
      highestSubCatAmount,
      sortedSubCats,
      sortedCategories,
      topCategory,
      topCategoryAmount,
      spendingComparisonText,
      highestIncreaseCat,
      maxIncreaseDiff,
      highestDecreaseCat,
      maxDecreaseDiff,
      
      // Yearly Returns (Matching Structure exactly)
      totalYearSpent,
      yoyChangeText,
      highestYearSubCat,
      highestYearSubCatAmount,
      sortedYearSubCats,
      sortedYearCategories,
      topYearCategory,
      topYearCategoryAmount,
      highestIncreaseYearCat,
      maxIncreaseYearDiff,
      highestDecreaseYearCat,
      maxDecreaseYearDiff
    };
  };

  const insights = getPeriodInsights();

  // ==========================================
  // RENDER 1: THE LOGIN/REGISTER SCREEN
  // ==========================================
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand auth-brand">
            <PiggyBank size={40} color="#606c38" strokeWidth={2.5} />
            <h1>SpendWise</h1>
          </div>
          <h2>{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
          
          <form onSubmit={handleAuth} className="auth-form">
            {!isLoginView && (
              <div className="field">
                <label>NAME</label>
                <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>EMAIL</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>PASSWORD</label>
              <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-save auth-btn">
              <Lock size={18} /> {isLoginView ? 'Login securely' : 'Sign Up'}
            </button>
          </form>

          <p className="auth-toggle">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLoginView(!isLoginView)}>
              {isLoginView ? "Sign up" : "Log in"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: THE SECURE DASHBOARD
  // ==========================================
  return (
    <div className="dashboard">
      {toast.show && <div className="toast"><CheckCircle size={18} /> {toast.msg}</div>}

      {/* DELETE TRANSACTION MODAL */}
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

      {/* LOGOUT CONFIRMATION MODAL */}
      {logoutModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Log Out?</h3>
            <p>Are you sure you want to end your secure session?</p>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setLogoutModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleLogout}>Yes, Log Out</button>
            </div>
          </div>
        </div>
      )}

      <aside className="left-side">
        <div className="brand">
          <PiggyBank size={32} color="#4b633a" strokeWidth={2.5} />
          <h1>SpendWise</h1>
        </div>

        <div className="summary-card">
          <span>TOTAL EXPENSES (ALL-TIME)</span>
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
              <label>SUB-CATEGORY (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Uber, Tuition, Cafe, etc." 
                value={subCategory} 
                onChange={(e) => setSubCategory(e.target.value)}
                list="subcategory-suggestions"
                autoComplete="off"
              />
              <datalist id="subcategory-suggestions">
                {getSubCategorySuggestions().map((sub, index) => (
                  <option key={index} value={sub}>{sub}</option>
                ))}
              </datalist>
            </div>

            <div className="field">
              <label>DATE</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            
            <button type="submit" className="btn-save">Add Transaction</button>
          </form>
        </section>
      </aside>

      <main className="right-side">
        {/* TAB & LOGOUT HEADER */}
        <div className="history-header">
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'Dashboard' ? 'active' : ''}`} 
              onClick={() => setActiveTab('Dashboard')}
            >
              Dashboard Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'History' ? 'active' : ''}`} 
              onClick={() => setActiveTab('History')}
            >
              Transaction History
            </button>
          </div>
          <button className="btn-logout" onClick={() => setLogoutModal(true)}>
            <LogOut size={16}/> Logout
          </button>
        </div>

        {/* VIEW 1: ADVANCED DASHBOARD TAB */}
        {activeTab === 'Dashboard' && (
          <div className="dashboard-grid">
            
            {/* Period Filter Dropdowns */}
            {/* Top-Level Filter & View Selector Bar (Uniform Vertical Spacing) */}
            <div className="period-selectors" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                
                {/* Preserves space in the DOM to prevent layout jumping */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--green-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Select Year
                  </label>
                  <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} style={{ marginTop: '2px' }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', visibility: view === 'Daily' ? 'visible' : 'hidden' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--green-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Select Month
                  </label>
                  <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} style={{ marginTop: '2px' }}>
                    {MONTHS.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                  </select>
                </div>
              </div>
                

              {/* View Mode stacked vertically to match the dropdowns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--green-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                  View Mode
                </span>
                <div className="toggle" style={{ marginTop: '2px' }}>
                  <button 
                    type="button" 
                    className={view === 'Daily' ? 'active' : ''} 
                    onClick={() => setView('Daily')}
                  >
                    Month View
                  </button>
                  <button 
                    type="button" 
                    className={view === 'Monthly' ? 'active' : ''} 
                    onClick={() => setView('Monthly')}
                  >
                    Year View
                  </button>
                </div>
              </div>
            </div>

            {/* Row 1: Charts Panel */}
            <div className="charts-row">
              {/* Area Chart Card */}
              <div className="dashboard-card">
                <div className="flex-row" style={{ marginBottom: '15px' }}>
                  <h4 className="card-title" style={{ margin: 0, textTransform: 'uppercase' }}>
                    {view === 'Daily' 
                      ? `DAILY TREND (${MONTHS[filterMonth]} ${filterYear})` 
                      : `MONTHLY TREND (Year ${filterYear})`
                    }
                  </h4>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={getChartData()}>
                    <XAxis dataKey="date" />
                    <Tooltip 
                      labelStyle={{ color: '#bc6c25', fontWeight: 'bold' }}
                      contentStyle={{ background:'#582f0e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px' }}
                      formatter={(value) => [`₹${value}`, 'Spent']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#606c38" fill="#606c38" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart Card */}
              <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Dynamic Title showing Month or Year context */}
                <h4 className="card-title" style={{ marginBottom: '15px', textTransform: 'uppercase' }}>
                  {view === 'Daily' 
                    ? `Category Split (${MONTHS[filterMonth]} ${filterYear})` 
                    : `Category Split (Year ${filterYear})`
                  }
                </h4>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colorFor(entry.name)} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: '#582f0e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px' }}
                          formatter={(value) => [`₹${value.toLocaleString()}`, 'Spent']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                      {pieData.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#555' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: colorFor(entry.name) }}></span>
                          <span>{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#888', padding: '40px 0' }}>
                    No recorded transactions for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Advanced Insights Section */}
            
            {/* 1. MONTHLY PERFORMANCE OVERVIEW (Only shows in Month View) */}
            {view === 'Daily' && (
              <div className="insights-container">
                <h4 className="card-title" style={{ margin: 0 }}>MONTHLY PERFORMANCE OVERVIEW</h4>
                <div className="insights-grid">
                  
                  <div className="insight-item">
                    <h5>Previous Month Comparison</h5>
                    <p>{insights.spendingComparisonText}</p>
                  </div>

                  <div className="insight-item">
                    <h5>Top Expense Area</h5>
                    <p>
                      {insights.topCategory !== "None" 
                        ? `${insights.topCategory} (₹${insights.topCategoryAmount.toLocaleString()})`
                        : "No category data available."
                      }
                    </p>
                  </div>

                  <div className="insight-item">
                    <h5>Highest Cost Sub-Category</h5>
                    <p>
                      {insights.highestSubCat !== "None"
                        ? `${insights.highestSubCat} (₹${insights.highestSubCatAmount.toLocaleString()})`
                        : "No sub-category records available."
                      }
                    </p>
                  </div>

                  <div className="insight-item">
                    <h5>Largest Category Shift</h5>
                    <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      {insights.highestIncreaseCat !== "None" && (
                        <span style={{ display: 'block', color: '#dc2626' }}>
                          🔺 Largest Increase: <strong>{insights.highestIncreaseCat}</strong> (+₹{insights.maxIncreaseDiff.toLocaleString()})
                        </span>
                      )}
                      {insights.highestDecreaseCat !== "None" && (
                        <span style={{ display: 'block', color: '#16a34a', marginTop: '4px' }}>
                          <span style={{ color: '#16a34a' }}>🔻</span> Largest Decrease: <strong>{insights.highestDecreaseCat}</strong> (₹{insights.maxDecreaseDiff.toLocaleString()})
                        </span>
                      )}
                      {insights.highestIncreaseCat === "None" && insights.highestDecreaseCat === "None" && (
                        "No comparative shifts found."
                      )}
                    </p>
                  </div>

                  {/* Top 5 Categories spending breakdown */}
                  <div className="insight-item" style={{ gridColumn: 'span 2' }}>
                    <h5>Monthly Spending by Category (Top 5)</h5>
                    {insights.sortedCategories.length > 0 ? (
                      <ul className="subcat-list">
                        {insights.sortedCategories.map(([cat, amt]) => (
                          <li key={cat}>
                            <span style={{ fontWeight: '500' }}>{cat}</span>
                            <span style={{ fontWeight: '700', color: 'var(--brown-light)' }}>₹{amt.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>No category expenses recorded this month.</p>
                    )}
                  </div>

                  {/* Top 5 Sub-categories spending breakdown */}
                  <div className="insight-item" style={{ gridColumn: 'span 2' }}>
                    <h5>Monthly Spending by Sub-Category (Top 5)</h5>
                    {insights.sortedSubCats.length > 0 ? (
                      <ul className="subcat-list">
                        {insights.sortedSubCats.map(([sub, amt]) => (
                          <li key={sub}>
                            <span style={{ fontWeight: '500' }}>{sub}</span>
                            <span style={{ fontWeight: '700', color: 'var(--brown-light)' }}>₹{amt.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>No sub-category expenses recorded this month.</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* 2. YEARLY PERFORMANCE OVERVIEW (Only shows in Year View) */}
            {view === 'Monthly' && (
              <div className="insights-container">
                <h4 className="card-title" style={{ margin: 0 }}>YEARLY PERFORMANCE OVERVIEW ({filterYear})</h4>
                <div className="insights-grid">
                  
                  <div className="insight-item">
                    <h5>Previous Year Comparison</h5>
                    <p>{insights.yoyChangeText}</p>
                  </div>

                  <div className="insight-item">
                    <h5>Top Expense Area (Yearly)</h5>
                    <p>
                      {insights.topYearCategory !== "None" 
                        ? `${insights.topYearCategory} (₹${insights.topYearCategoryAmount.toLocaleString()})`
                        : "No yearly category data available."
                      }
                    </p>
                  </div>

                  <div className="insight-item">
                    <h5>Highest Cost Sub-Category (Yearly)</h5>
                    <p>
                      {insights.highestYearSubCat !== "None"
                        ? `${insights.highestYearSubCat} (₹${insights.highestYearSubCatAmount.toLocaleString()})`
                        : "No yearly sub-category records available."
                      }
                    </p>
                  </div>

                  <div className="insight-item">
                    <h5>Largest Category Shift (Yearly)</h5>
                    <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      {insights.highestIncreaseYearCat !== "None" && (
                        <span style={{ display: 'block', color: '#dc2626' }}>
                          🔺 Largest Increase: <strong>{insights.highestIncreaseYearCat}</strong> (+₹{insights.maxIncreaseYearDiff.toLocaleString()})
                        </span>
                      )}
                      {insights.highestDecreaseYearCat !== "None" && (
                        <span style={{ display: 'block', color: '#16a34a', marginTop: '4px' }}>
                          <span style={{ color: '#16a34a' }}>🔻</span> Largest Decrease: <strong>{insights.highestDecreaseYearCat}</strong> (₹{insights.maxDecreaseYearDiff.toLocaleString()})
                        </span>
                      )}
                      {insights.highestIncreaseYearCat === "None" && insights.highestDecreaseYearCat === "None" && (
                        "No comparative shifts found."
                      )}
                    </p>
                  </div>

                  {/* Top 5 Categories spending breakdown (Yearly) */}
                  <div className="insight-item" style={{ gridColumn: 'span 2' }}>
                    <h5>Yearly Spending by Category (Top 5)</h5>
                    {insights.sortedYearCategories.length > 0 ? (
                      <ul className="subcat-list">
                        {insights.sortedYearCategories.map(([cat, amt]) => (
                          <li key={cat}>
                            <span style={{ fontWeight: '500' }}>{cat}</span>
                            <span style={{ fontWeight: '700', color: 'var(--brown-light)' }}>₹{amt.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>No category expenses recorded this year.</p>
                    )}
                  </div>

                  {/* Top 5 Sub-categories spending breakdown (Yearly) */}
                  <div className="insight-item" style={{ gridColumn: 'span 2' }}>
                    <h5>Yearly Spending by Sub-Category (Top 5)</h5>
                    {insights.sortedYearSubCats.length > 0 ? (
                      <ul className="subcat-list">
                        {insights.sortedYearSubCats.map(([sub, amt]) => (
                          <li key={sub}>
                            <span style={{ fontWeight: '500' }}>{sub}</span>
                            <span style={{ fontWeight: '700', color: 'var(--brown-light)' }}>₹{amt.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>No sub-category expenses recorded this year.</p>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: TRANSACTION HISTORY TAB */}
        {activeTab === 'History' && (
          <div className="history-list" style={{ marginTop: '10px' }}>
            {transactions.length > 0 ? (
              transactions.map(tx => (
                <div key={tx._id} className="history-card">
                  <div className="tx-date">
                    {new Date(tx.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                  </div>
                  <div className="tx-info">
                    <div className="tx-cat-badge">
                      {tx.category} {tx.subCategory ? `› ${tx.subCategory}` : ''}
                    </div>
                    <h5>{tx.title}</h5>
                  </div>
                  <div className="tx-price">
                    <span>₹{tx.amount}</span>
                    <button onClick={() => confirmDelete(tx._id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '14px' }}>
                No recorded transactions found.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;