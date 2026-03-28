// Expense Management with Database Integration
let expenses = [];
let user = null;

// Initialize expense page
async function initializeExpensePage() {
  try {
    // Check authentication
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      window.location.href = 'login.html';
      return;
    }

    user = JSON.parse(storedUser);
    console.log('✅ User authenticated:', user.name);

    // Load expenses from database
    await loadExpenses();
    
    // Set up event listeners
    setupEventListeners();
    
    // Render initial data
    renderExpenses();
    renderCategoryBreakdown();
    
  } catch (error) {
    console.error('❌ Error initializing expense page:', error);
    showToast('Failed to load expense data', 'error');
  }
}

// Load expenses from database
async function loadExpenses() {
  try {
    const response = await fetch('/api/expenses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }

    expenses = await response.json();
    console.log('✅ Loaded expenses:', expenses.length);
    
    // Update balance display
    updateBalance();
    
  } catch (error) {
    console.error('❌ Error loading expenses:', error);
    showToast('Failed to load expenses', 'error');
  }
}

// Add new expense
async function addExpense(expenseData) {
  try {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add expense');
    }

    const result = await response.json();
    console.log('✅ Expense added:', result.expense);
    
    // Reload expenses to get updated data
    await loadExpenses();
    
    // Re-render the UI
    renderExpenses();
    renderCategoryBreakdown();
    
    showToast('Expense added successfully!', 'success');
    
    return result.expense;
    
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    showToast(error.message || 'Failed to add expense', 'error');
    throw error;
  }
}

// Delete expense
async function deleteExpense(expenseId) {
  try {
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete expense');
    }

    console.log('✅ Expense deleted:', expenseId);
    
    // Reload expenses to get updated data
    await loadExpenses();
    
    // Re-render the UI
    renderExpenses();
    renderCategoryBreakdown();
    
    showToast('Expense deleted successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    showToast(error.message || 'Failed to delete expense', 'error');
  }
}

// Render expenses list
function renderExpenses() {
  const recentExpensesList = document.getElementById('recentExpensesList');
  if (!recentExpensesList) return;

  recentExpensesList.innerHTML = '';

  if (expenses.length === 0) {
    recentExpensesList.innerHTML = '<li style="color:#7B8A97;text-align:center;">No expenses yet.</li>';
    return;
  }

  // Show most recent expenses first
  expenses.slice(0, 10).forEach((expense) => {
    const li = document.createElement('li');
    li.className = 'recent-expense-item';
    
    const date = new Date(expense.date).toLocaleDateString('en-GB');
    
    li.innerHTML = `
      <div class="recent-expense-info">
        <span class="recent-expense-title">${expense.note || 'Expense'}</span>
        <span class="recent-expense-meta">${expense.category} · ${date}</span>
      </div>
      <div>
        <span class="recent-expense-amount">₹${expense.amount.toFixed(2)}</span>
        <span class="recent-expense-delete" data-id="${expense._id}">Delete</span>
      </div>
    `;
    
    recentExpensesList.appendChild(li);
  });

  // Add delete event listeners
  recentExpensesList.querySelectorAll('.recent-expense-delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const expenseId = this.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(expenseId);
      }
    });
  });
}

// Render category breakdown
function renderCategoryBreakdown() {
  const categoryBreakdownGrid = document.getElementById('categoryBreakdownGrid');
  if (!categoryBreakdownGrid) return;

  const CATEGORIES = [
    'Food & Dining',
    'Transportation', 
    'Rent & Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Others'
  ];
  
  const CATEGORY_ICONS = [
    '🍽️', '🚌', '🏠', '🎬', '❤️', '🛍️', '⚙️'
  ];
  
  const CATEGORY_COLORS = [
    '#FF5A5A', '#00BFFF', '#1DE9B6', '#B39DDB', '#E57373', '#7B8A97', '#757575'
  ];

  categoryBreakdownGrid.innerHTML = '';

  // Calculate totals by category
  const totals = {};
  let grandTotal = 0;
  
  expenses.forEach(expense => {
    if (!totals[expense.category]) {
      totals[expense.category] = 0;
    }
    totals[expense.category] += expense.amount;
    grandTotal += expense.amount;
  });

  // Render category cards
  CATEGORIES.forEach((category, index) => {
    const amount = totals[category] || 0;
    const percent = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-icon" style="color:${CATEGORY_COLORS[index]};">${CATEGORY_ICONS[index]}</div>
      <div class="category-name">${category}</div>
      <div class="category-amount">₹${amount.toFixed(2)}</div>
      <div class="category-percent">${percent.toFixed(1)}%</div>
    `;
    
    categoryBreakdownGrid.appendChild(card);
  });
}

// Update balance display
function updateBalance() {
  const expenseBalance = document.querySelector('.expense-balance');
  if (!expenseBalance) return;

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  expenseBalance.textContent = `₹${total.toFixed(2)}`;
}

// Setup event listeners
function setupEventListeners() {
  const addExpenseForm = document.getElementById('addExpenseForm');
  if (!addExpenseForm) return;

  addExpenseForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const note = document.getElementById('expenseNote').value;

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      document.getElementById('expenseAmount').focus();
      return;
    }

    if (!category) {
      showToast('Please select a category', 'error');
      document.getElementById('expenseCategory').focus();
      return;
    }

    try {
      await addExpense({ amount, category, note });
      
      // Reset form
      addExpenseForm.reset();
      
    } catch (error) {
      // Error already handled in addExpense function
    }
  });
}

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  // Check if toast container exists, if not create it
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toast.style.cssText = `
    background: #fff;
    color: #2C3E50;
    border: 1px solid #F0F0F0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(44,62,80,0.12);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    pointer-events: auto;
    border-left: 4px solid ${type === 'success' ? '#1DE9B6' : '#FF5A5A'};
    background: linear-gradient(135deg, ${type === 'success' ? '#F0FDF4' : '#FEF2F2'}, #fff);
  `;
  
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.style.opacity = '1', 100);
  setTimeout(() => toast.style.transform = 'translateX(0)', 100);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeExpensePage);
