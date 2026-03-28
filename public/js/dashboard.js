// Dashboard with Real Database Integration
let dashboardData = null;
let user = null;

// Initialize dashboard with real data
async function initializeDashboard() {
  try {
    // Check authentication
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      window.location.href = 'login.html';
      return;
    }

    user = JSON.parse(storedUser);
    console.log('✅ User authenticated:', user.name);

    // Update user interface
    updateUserInterface();
    
    // Load dashboard data from database
    await loadDashboardData();
    
    // Update dashboard cards and charts
    updateDashboardCards();
    updateCharts();
    
    // Set up real-time updates
    setupRealTimeUpdates();
    
    // Set up event listeners
    setupEventListeners();
    
    // Handle profile update success
    handleProfileUpdateSuccess();
    
  } catch (error) {
    console.error('❌ Error initializing dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

// Set up event listeners
function setupEventListeners() {
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdownMenu');
    const avatar = document.getElementById('userAvatar');
    
    if (dropdown && avatar && !dropdown.contains(event.target) && !avatar.contains(event.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Close dropdown on escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const dropdown = document.getElementById('dropdownMenu');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }
  });

  // Navigation: simulate login/register to dashboard
  document.querySelectorAll('.auth-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'dashboard.html';
    });
  });
}

// Handle profile update success
function handleProfileUpdateSuccess() {
  // Check if returning from profile update
  const urlParams = new URLSearchParams(window.location.search);
  const profileUpdated = sessionStorage.getItem('profileUpdated');
  const updatedUserData = sessionStorage.getItem('updatedUserData');
  
  if ((profileUpdated === 'true' && updatedUserData) || urlParams.get('updated') === 'true') {
    console.log('🔄 Returning from profile update, using updated data...');
    // Use the updated user data from profile update
    if (updatedUserData) {
      const updatedUser = JSON.parse(updatedUserData);
      // Update localStorage with the updated data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Update current user variable
      user = updatedUser;
      // Update UI with new data
      updateUserInterface();
      console.log('✅ Updated user data applied:', updatedUser);
    }
    // Clear the flags
    sessionStorage.removeItem('profileUpdated');
    sessionStorage.removeItem('updatedUserData');
    // Show success message
    showToast('Profile updated successfully!', 'success');
  }
}

// Dropdown functionality
function toggleDropdown() {
  const dropdown = document.getElementById('dropdownMenu');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Logout function
async function handleLogout() {
  try {
    // Try to logout from server
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    // Clear localStorage regardless of server response
    localStorage.removeItem('user');
    
    // Redirect to login with logout parameter to clear any cached data
    window.location.href = 'login.html?logout=true';
  } catch (error) {
    console.error('Logout error:', error);
    // Clear localStorage and redirect to login
    localStorage.removeItem('user');
    window.location.href = 'login.html?logout=true';
  }
}

// Make functions globally available
window.toggleDropdown = toggleDropdown;
window.handleLogout = handleLogout;

// Load dashboard data from database
async function loadDashboardData() {
  try {
    console.log('📡 Fetching dashboard data from /api/dashboard-data...');
    const response = await fetch('/api/dashboard-data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server error:', errorData);
      throw new Error(errorData.message || 'Failed to fetch dashboard data');
    }

    dashboardData = await response.json();
    console.log('✅ Loaded dashboard data:', dashboardData);
    console.log('💰 Savings data in dashboard:', {
      savingsGoal: dashboardData.monthlyData?.savingsGoal,
      savingsHistory: dashboardData.savingsHistory
    });
    
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showToast(`Failed to load dashboard data: ${error.message}`, 'error');
    
    // Use fallback data
    dashboardData = {
      user: user,
      monthlyData: {
        totalBalance: 0,
        monthlyIncome: user.salary || 0,
        monthlyExpenses: 0,
        savingsGoal: 0
      },
      categoryBreakdown: {},
      incomeExpenseHistory: [],
      recentExpenses: []
    };
  }
}

// Update user interface elements
function updateUserInterface() {
  // Update greeting
  const greetingH1 = document.querySelector('.dashboard-greeting h1');
  const greetingP = document.querySelector('.dashboard-greeting p');
  
  if (greetingH1) {
    greetingH1.textContent = `Welcome back, ${user.name || 'User'}!`;
  }
  
  if (greetingP) {
    greetingP.textContent = `Here's your financial overview for this month`;
  }
  
  // Update current date
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const currentDateElement = document.getElementById('currentDate');
  if (currentDateElement) {
    currentDateElement.textContent = `Today, ${day}/${month}/${year}`;
  }
  
  // Generate initials from user name
  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('');
  
  // Update avatar and dropdown
  const userAvatar = document.getElementById('userAvatar');
  const dropdownAvatar = document.getElementById('dropdownAvatar');
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');
  
  if (userAvatar) userAvatar.textContent = initials;
  if (dropdownAvatar) dropdownAvatar.textContent = initials;
  if (dropdownName) dropdownName.textContent = user.name || 'User';
  if (dropdownEmail) dropdownEmail.textContent = user.email || 'user@example.com';
}

// Update dashboard cards with real data
function updateDashboardCards() {
  if (!dashboardData) return;

  const { monthlyData } = dashboardData;
  
  // Update card values
  const totalBalanceElement = document.getElementById('totalBalance');
  const monthlyIncomeElement = document.getElementById('monthlyIncome');
  const monthlyExpensesElement = document.getElementById('monthlyExpenses');
  const savingsGoalElement = document.getElementById('savingsGoal');
  
  if (totalBalanceElement) {
    totalBalanceElement.textContent = `₹${monthlyData.totalBalance.toLocaleString()}`;
  }
  
  if (monthlyIncomeElement) {
    monthlyIncomeElement.textContent = `₹${monthlyData.monthlyIncome.toLocaleString()}`;
  }
  
  if (monthlyExpensesElement) {
    monthlyExpensesElement.textContent = `₹${monthlyData.monthlyExpenses.toLocaleString()}`;
  }
  
  if (savingsGoalElement) {
    savingsGoalElement.textContent = `₹${monthlyData.savingsGoal.toLocaleString()}`;
  }
  
  // Update change indicators (simplified for now)
  const changeElements = document.querySelectorAll('.card-change');
  changeElements.forEach((element, index) => {
    if (index === 0) { // Total Balance
      element.textContent = monthlyData.totalBalance >= 0 ? '+5.2% from last month' : '-2.1% from last month';
      element.className = `card-change ${monthlyData.totalBalance >= 0 ? 'positive' : 'negative'}`;
    } else if (index === 1) { // Monthly Income
      element.textContent = '+2.1% from last month';
      element.className = 'card-change positive';
    } else if (index === 2) { // Monthly Expenses
      element.textContent = monthlyData.monthlyExpenses > 0 ? '-8.3% from last month' : 'No expenses yet';
      element.className = `card-change ${monthlyData.monthlyExpenses > 0 ? 'negative' : 'neutral'}`;
    } else if (index === 3) { // Savings Goal
      element.textContent = '+12% from last month';
      element.className = 'card-change neutral';
    }
  });
}

// Update charts with real data
function updateCharts() {
  if (!dashboardData) return;

  updateExpensePieChart();
  updateSavingsLineChart();
  updateIncomeExpenseBarChart();
}

// Update Expense Breakdown Pie Chart
function updateExpensePieChart() {
  const ctx = document.getElementById('expensePie');
  if (!ctx) return;

  // Destroy existing chart if it exists
  if (window.expensePieChart) {
    window.expensePieChart.destroy();
  }

  const { categoryBreakdown } = dashboardData;
  const totalExpenses = dashboardData.monthlyData.monthlyExpenses;

  let labels = [];
  let data = [];
  let colors = ['#FF5A5A', '#00BFFF', '#1DE9B6', '#B39DDB', '#E57373', '#7B8A97', '#757575'];

  if (totalExpenses > 0) {
    Object.entries(categoryBreakdown).forEach(([category, amount], index) => {
      const percentage = Math.round((amount / totalExpenses) * 100);
      labels.push(`${category} ${percentage}%`);
      data.push(amount);
    });
  }

  // If no data, show placeholder
  if (data.length === 0) {
    labels = ['No expenses yet'];
    data = [1];
    colors = ['#E0E0E0'];
  }

  window.expensePieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      plugins: { 
        legend: { 
          position: 'right', 
          labels: { font: { size: 14 } } 
        } 
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Update Savings Trend Line Chart
function updateSavingsLineChart() {
  const ctx = document.getElementById('savingsLine');
  if (!ctx) {
    console.log('❌ Savings line chart canvas not found');
    return;
  }

  console.log('📊 Updating savings trend line chart...');

  // Destroy existing chart if it exists
  if (window.savingsLineChart) {
    window.savingsLineChart.destroy();
  }

  // Use real savings data from database
  const { savingsHistory } = dashboardData;
  
  console.log('📈 Savings history data:', savingsHistory);
  
  let labels = [];
  let savingsData = [];

  if (savingsHistory && savingsHistory.length > 0) {
    console.log('✅ Using real savings data');
    // Sort savings by creation date
    const sortedSavings = savingsHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Create cumulative savings data
    let cumulativeSavings = 0;
    labels = sortedSavings.map((goal, index) => {
      cumulativeSavings += goal.savedAmount;
      return `${goal.title.substring(0, 8)}...`;
    });
    savingsData = sortedSavings.map((goal, index) => {
      return sortedSavings.slice(0, index + 1).reduce((sum, g) => sum + g.savedAmount, 0);
    });
  } else {
    console.log('📊 Using fallback savings data');
    // Fallback data if no savings goals - create a simple trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseSavings = dashboardData.monthlyData.savingsGoal || 0;
    labels = months;
    savingsData = months.map((_, index) => {
      // Simulate growing savings based on current savings goal
      return Math.max(0, (baseSavings / 6) * (index + 1));
    });
  }

  console.log('📊 Chart data:', { labels, savingsData });

  window.savingsLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Savings',
        data: savingsData,
        borderColor: '#00BFFF',
        backgroundColor: 'rgba(0,191,255,0.08)',
        tension: 0.4,
        pointBackgroundColor: '#00BFFF',
        pointRadius: 5,
        fill: false
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: '#F0F0F0' } },
        x: { grid: { color: '#F0F0F0' } }
      }
    }
  });
}

// Update Income vs Expenses Bar Chart
function updateIncomeExpenseBarChart() {
  const ctx = document.getElementById('incomeBar');
  if (!ctx) return;

  // Destroy existing chart if it exists
  if (window.incomeBarChart) {
    window.incomeBarChart.destroy();
  }

  const { incomeExpenseHistory } = dashboardData;
  
  let labels = [];
  let incomeData = [];
  let expenseData = [];

  if (incomeExpenseHistory && incomeExpenseHistory.length > 0) {
    labels = incomeExpenseHistory.map(item => item.month);
    incomeData = incomeExpenseHistory.map(item => item.income);
    expenseData = incomeExpenseHistory.map(item => item.expense);
  } else {
    // Fallback data
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    incomeData = Array(6).fill(dashboardData.monthlyData.monthlyIncome);
    expenseData = Array(6).fill(dashboardData.monthlyData.monthlyExpenses);
  }

  window.incomeBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: '#00BFFF',
          borderRadius: 8,
          barPercentage: 0.45
        },
        {
          label: 'Expense',
          data: expenseData,
          backgroundColor: '#1DE9B6',
          borderRadius: 8,
          barPercentage: 0.45
        }
      ]
    },
    options: {
      plugins: { legend: { display: true, position: 'top' } },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: '#F0F0F0' } },
        x: { grid: { color: '#F0F0F0' } }
      }
    }
  });
}

// Setup real-time updates
function setupRealTimeUpdates() {
  // Refresh data when page becomes visible
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      console.log('🔄 Page became visible, refreshing dashboard data...');
      await loadDashboardData();
      updateDashboardCards();
      updateCharts();
    }
  });

  // Refresh data every 30 seconds if page is active
  setInterval(async () => {
    if (!document.hidden) {
      await loadDashboardData();
      updateDashboardCards();
      updateCharts();
    }
  }, 30000);
}

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
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

// Make toast function globally available
window.showToast = showToast;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard); 