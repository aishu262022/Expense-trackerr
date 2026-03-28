const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// Import models
const User = require('./models/User');
const EMI = require('./models/EMI');
const Expense = require('./models/Expense');
const Savings = require('./models/Savings');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
// MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });



// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ✅ REGISTER endpoint
app.post('/register', async (req, res) => {
  const { name, email, mobile, occupation, salary, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '❌ Passwords do not match' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: '❌ Email already registered' });
    }

    const newUser = new User({ name, email, mobile, occupation, salary, password });
    await newUser.save();
    res.status(200).json({ message: '✅ User registered successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to register user' });
  }
});

// ✅ LOGIN endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔍 Login attempt for email:', email);

  try {
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      console.log('❌ Login failed - invalid credentials for:', email);
      return res.status(401).json({ message: '❌ Invalid email or password' });
    }

    console.log('✅ User found, creating session for:', user.name);

    // Store user in session
    req.session.userId = user._id;
    req.session.user = {
      name: user.name,
      email: user.email,
      occupation: user.occupation,
      salary: user.salary
    };

    console.log('✅ Session created - Session ID:', req.sessionID);
    console.log('✅ Session data stored:', req.session);

    res.status(200).json({
      message: '✅ Login successful',
      user: {
        name: user.name,
        email: user.email,
        occupation: user.occupation,
        salary: user.salary
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: '❌ Server error during login' });
  }
});


// ✅ FETCH CURRENT USER DATA
app.get('/api/current-user', async (req, res) => {
  try {
    console.log('🔍 Current user request - Session ID:', req.sessionID);
    console.log('🔍 Current user request - Session data:', req.session);
    console.log('🔍 Current user request - User ID:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session, returning 401');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const user = await User.findById(req.session.userId, { password: 0 });
    if (!user) {
      console.log('❌ User not found in database for ID:', req.session.userId);
      return res.status(404).json({ message: '❌ User not found' });
    }

    console.log('✅ User found:', user.name, user.email);

    // Initialize financial data if it doesn't exist
    if (!user.financialData || !user.financialData.monthlyIncome) {
      if (!user.financialData) {
        user.financialData = {};
      }
      user.financialData.monthlyIncome = user.salary || 0;
      user.financialData.lastUpdated = new Date();
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('❌ Error in current-user endpoint:', err);
    res.status(500).json({ message: '❌ Failed to fetch user data' });
  }
});

// ✅ LOGOUT endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: '❌ Error logging out' });
    }
    res.status(200).json({ message: '✅ Logged out successfully' });
  });
});

// ✅ UPDATE PROFILE endpoint
app.put('/api/update-profile', async (req, res) => {
  try {
    console.log('🔍 Profile update request - Session ID:', req.sessionID);
    console.log('🔍 Profile update request - Session data:', req.session);
    console.log('🔍 Profile update request - User ID:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session for profile update, returning 401');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { name, email, mobile, occupation, salary } = req.body;
    console.log('🔍 Profile update data:', { name, email, mobile, occupation, salary });
    
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: req.session.userId } });
    if (existingUser) {
      console.log('❌ Email already in use by another user');
      return res.status(400).json({ message: '❌ Email already in use' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.userId,
      { name, email, mobile, occupation, salary },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log('❌ User not found for update');
      return res.status(404).json({ message: '❌ User not found' });
    }

    console.log('✅ User updated successfully:', updatedUser.name);

    // Update session data
    req.session.user = {
      name: updatedUser.name,
      email: updatedUser.email,
      occupation: updatedUser.occupation,
      salary: updatedUser.salary
    };

    // Update financial data monthly income if salary changed
    if (updatedUser.financialData && updatedUser.financialData.monthlyIncome !== updatedUser.salary) {
      updatedUser.financialData.monthlyIncome = updatedUser.salary;
      updatedUser.financialData.lastUpdated = new Date();
      await updatedUser.save();
      console.log('✅ Financial data updated with new salary:', updatedUser.salary);
    }

    // Keep the session alive by updating the session expiry
    req.session.touch();
    console.log('✅ Session refreshed');

    res.status(200).json({
      message: '✅ Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        occupation: updatedUser.occupation,
        salary: updatedUser.salary
      }
    });
  } catch (err) {
    console.error('❌ Error in profile update endpoint:', err);
    res.status(500).json({ message: '❌ Failed to update profile' });
  }
});

// ✅ CHANGE PASSWORD endpoint
app.put('/api/change-password', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // Verify current password
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: '❌ Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: '✅ Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to update password' });
  }
});

// ✅ FETCH REGISTERED USERS (for admin purposes)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // exclude password for safety
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch users' });
  }
});

// ✅ GET USER'S FINANCIAL DATA
app.get('/api/financial-data', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // If no financial data exists, initialize it
    if (!user.financialData || Object.keys(user.financialData).length === 0) {
      user.financialData = {
        monthlyIncome: user.salary || 0,
        // Initialize with sample data for charts
        expenseBreakdown: {
          rent: 0,
          food: 0,
          transport: 0,
          utilities: 0,
          others: 0
        },
        savingsHistory: [
          { month: 'Jan', amount: 0 },
          { month: 'Feb', amount: 0 },
          { month: 'Mar', amount: 0 },
          { month: 'Apr', amount: 0 },
          { month: 'May', amount: 0 },
          { month: 'Jun', amount: 0 }
        ],
        incomeExpenseHistory: [
          { month: 'Jan', income: user.salary || 0, expense: 0 },
          { month: 'Feb', income: user.salary || 0, expense: 0 },
          { month: 'Mar', income: user.salary || 0, expense: 0 },
          { month: 'Apr', income: user.salary || 0, expense: 0 },
          { month: 'May', income: user.salary || 0, expense: 0 },
          { month: 'Jun', income: user.salary || 0, expense: 0 }
        ]
      };
      await user.save();
    }

    res.json(user.financialData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch financial data' });
  }
});

// ✅ UPDATE USER'S FINANCIAL DATA
app.put('/api/financial-data', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const {
      totalExpense,
      totalEMI,
      totalDebt,
      totalSavings,
      monthlyIncome,
      expenseBreakdown,
      savingsHistory,
      incomeExpenseHistory
    } = req.body;

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // Initialize financial data if it doesn't exist
    if (!user.financialData) {
      user.financialData = {};
    }

    // Update financial data fields
    if (totalExpense !== undefined) user.financialData.totalExpense = totalExpense;
    if (totalEMI !== undefined) user.financialData.totalEMI = totalEMI;
    if (totalDebt !== undefined) user.financialData.totalDebt = totalDebt;
    if (totalSavings !== undefined) user.financialData.totalSavings = totalSavings;
    if (monthlyIncome !== undefined) user.financialData.monthlyIncome = monthlyIncome;
    if (expenseBreakdown) user.financialData.expenseBreakdown = expenseBreakdown;
    if (savingsHistory) user.financialData.savingsHistory = savingsHistory;
    if (incomeExpenseHistory) user.financialData.incomeExpenseHistory = incomeExpenseHistory;
    
    // Update lastUpdated timestamp
    user.financialData.lastUpdated = new Date();

    await user.save();
    res.json({ message: '✅ Financial data updated successfully', data: user.financialData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to update financial data' });
  }
});

// ✅ UPDATE SPECIFIC FINANCIAL FIELD
app.patch('/api/financial-data/:field', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { field } = req.params;
    const { value } = req.body;

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    // Initialize financial data if it doesn't exist
    if (!user.financialData) {
      user.financialData = {};
    }

    // Update the specific field in financial data
    if (user.financialData.hasOwnProperty(field) || ['totalExpense', 'totalEMI', 'totalDebt', 'totalSavings', 'monthlyIncome', 'expenseBreakdown', 'savingsHistory', 'incomeExpenseHistory'].includes(field)) {
      user.financialData[field] = value;
      user.financialData.lastUpdated = new Date();
      await user.save();
      res.json({ message: '✅ Field updated successfully', data: user.financialData });
    } else {
      res.status(400).json({ message: '❌ Invalid field name' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to update field' });
  }
});

// ✅ EMI API ROUTES

// GET all EMIs for the logged-in user
app.get('/api/emis', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const emis = await EMI.find({ userId: req.session.userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json(emis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch EMIs' });
  }
});

// POST new EMI
app.post('/api/emis', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { loanType, amount, interestRate, tenure, startDate } = req.body;

    // Validate required fields
    if (!loanType || !amount || !interestRate || !tenure || !startDate) {
      return res.status(400).json({ message: '❌ All fields are required' });
    }

    // Create new EMI
    const newEMI = new EMI({
      userId: req.session.userId,
      loanType,
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      tenure: parseInt(tenure),
      startDate: new Date(startDate)
    });

    await newEMI.save();

    res.status(201).json({
      message: '✅ EMI added successfully',
      emi: newEMI
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to add EMI' });
  }
});

// DELETE EMI
app.delete('/api/emis/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { id } = req.params;

    const emi = await EMI.findOneAndUpdate(
      { _id: id, userId: req.session.userId },
      { isActive: false },
      { new: true }
    );

    if (!emi) {
      return res.status(404).json({ message: '❌ EMI not found' });
    }

    res.json({ message: '✅ EMI deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to delete EMI' });
  }
});

// GET EMI statistics
app.get('/api/emis/stats', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const emis = await EMI.find({ userId: req.session.userId, isActive: true });

    const stats = {
      totalEMIs: emis.length,
      totalMonthlyPayment: emis.reduce((sum, emi) => sum + emi.monthlyPayment, 0),
      avgInterestRate: emis.length > 0 
        ? emis.reduce((sum, emi) => sum + emi.interestRate, 0) / emis.length 
        : 0
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch EMI statistics' });
  }
});

// ✅ EXPENSE API ROUTES

// GET all expenses for the logged-in user
app.get('/api/expenses', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const expenses = await Expense.find({ userId: req.session.userId, isActive: true })
      .sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch expenses' });
  }
});

// POST new expense
app.post('/api/expenses', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { amount, category, note } = req.body;

    // Validate required fields
    if (!amount || !category) {
      return res.status(400).json({ message: '❌ Amount and category are required' });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: '❌ Invalid amount' });
    }

    // Create new expense
    const newExpense = new Expense({
      userId: req.session.userId,
      amount: parseFloat(amount),
      category,
      note: note || ''
    });

    await newExpense.save();

    res.status(201).json({
      message: '✅ Expense added successfully',
      expense: newExpense
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to add expense' });
  }
});

// DELETE expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { id } = req.params;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId: req.session.userId },
      { isActive: false },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: '❌ Expense not found' });
    }

    res.json({ message: '✅ Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to delete expense' });
  }
});

// ==================== SAVINGS API ENDPOINTS ====================

// GET all savings goals for a user
app.get('/api/savings', async (req, res) => {
  try {
    console.log('🔍 GET /api/savings request');
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    console.log('✅ User authenticated, fetching savings for user:', req.session.userId);
    const savings = await Savings.find({ userId: req.session.userId })
      .sort({ createdAt: -1 });

    console.log('📊 Found savings goals:', savings.length);
    res.json(savings);
  } catch (err) {
    console.error('❌ Error fetching savings:', err);
    res.status(500).json({ message: '❌ Failed to fetch savings goals' });
  }
});

// POST create new savings goal
app.post('/api/savings', async (req, res) => {
  try {
    console.log('🔍 POST /api/savings request');
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    console.log('Request body:', req.body);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { title, targetAmount, targetDate } = req.body;

    if (!title || !targetAmount || !targetDate) {
      console.log('❌ Missing required fields:', { title, targetAmount, targetDate });
      return res.status(400).json({ message: '❌ Missing required fields' });
    }

    console.log('✅ Creating new savings goal for user:', req.session.userId);
    const newSavings = new Savings({
      userId: req.session.userId,
      title,
      targetAmount: Number(targetAmount),
      targetDate: new Date(targetDate)
    });

    await newSavings.save();
    console.log('✅ Savings goal created successfully:', newSavings._id);

    res.status(201).json(newSavings);
  } catch (err) {
    console.error('❌ Error creating savings goal:', err);
    res.status(500).json({ message: '❌ Failed to create savings goal' });
  }
});

// PUT update savings goal (add/remove money)
app.put('/api/savings/:id', async (req, res) => {
  try {
    console.log('🔍 PUT /api/savings/:id request');
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    console.log('Goal ID:', req.params.id);
    console.log('Request body:', req.body);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { id } = req.params;
    const { savedAmount } = req.body;

    console.log('✅ User authenticated, updating savings goal:', id);
    console.log('💰 New saved amount:', savedAmount);

    const savings = await Savings.findOne({ _id: id, userId: req.session.userId });

    if (!savings) {
      console.log('❌ Savings goal not found');
      return res.status(404).json({ message: '❌ Savings goal not found' });
    }

    console.log('✅ Found savings goal:', savings.title);
    console.log('💰 Old saved amount:', savings.savedAmount);
    
    savings.savedAmount = Math.max(0, Number(savedAmount));
    await savings.save();

    console.log('✅ Savings goal updated successfully');
    console.log('💰 New saved amount:', savings.savedAmount);
    
    res.json(savings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to update savings goal' });
  }
});

// DELETE savings goal
app.delete('/api/savings/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const { id } = req.params;

    const savings = await Savings.findOneAndDelete({ _id: id, userId: req.session.userId });

    if (!savings) {
      return res.status(404).json({ message: '❌ Savings goal not found' });
    }

    res.json({ message: '✅ Savings goal deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to delete savings goal' });
  }
});

// GET savings statistics
app.get('/api/savings/stats', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    const savings = await Savings.find({ userId: req.session.userId });

    const totalSaved = savings.reduce((sum, goal) => sum + goal.savedAmount, 0);
    const totalTarget = savings.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const completedGoals = savings.filter(goal => goal.status === 'completed').length;
    const activeGoals = savings.filter(goal => goal.status === 'active').length;

    res.json({
      totalSaved,
      totalTarget,
      completedGoals,
      activeGoals,
      totalGoals: savings.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Failed to fetch savings statistics' });
  }
});

// GET dashboard data (expenses, salary, charts data)
app.get('/api/dashboard-data', async (req, res) => {
  try {
    console.log('🔍 GET /api/dashboard-data request');
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ message: '❌ Not logged in' });
    }

    console.log('✅ User authenticated, fetching dashboard data for user:', req.session.userId);

    // Get user data
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ message: '❌ User not found' });
    }

    console.log('✅ User found:', user.name);

    // Get current month expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyExpenses = await Expense.find({
      userId: req.session.userId,
      isActive: true,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Calculate total monthly expenses
    const totalMonthlyExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate category breakdown
    const categoryBreakdown = {};
    monthlyExpenses.forEach(expense => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = 0;
      }
      categoryBreakdown[expense.category] += expense.amount;
    });

    // Get savings data
    const savings = await Savings.find({ userId: req.session.userId });
    const totalSaved = savings.reduce((sum, goal) => sum + goal.savedAmount, 0);
    const totalTarget = savings.reduce((sum, goal) => sum + goal.targetAmount, 0);

    // Get last 6 months data for charts
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthExpenses = await Expense.find({
        userId: req.session.userId,
        isActive: true,
        date: { $gte: monthStart, $lte: monthEnd }
      });

      const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      last6Months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        income: user.salary || 0,
        expense: monthTotal
      });
    }

    // Calculate total balance
    const totalBalance = (user.salary || 0) - totalMonthlyExpenses;

    const responseData = {
      user: {
        name: user.name,
        email: user.email,
        salary: user.salary || 0
      },
      monthlyData: {
        totalBalance,
        monthlyIncome: user.salary || 0,
        monthlyExpenses: totalMonthlyExpenses,
        savingsGoal: totalSaved
      },
      categoryBreakdown,
      incomeExpenseHistory: last6Months,
      savingsHistory: savings.map(goal => ({
        title: goal.title,
        savedAmount: goal.savedAmount,
        targetAmount: goal.targetAmount,
        progress: goal.progressPercentage,
        status: goal.status,
        createdAt: goal.createdAt
      })),
      recentExpenses: monthlyExpenses.slice(0, 5) // Last 5 expenses
    };

    console.log('✅ Dashboard data prepared successfully');
    console.log('💰 Savings data in response:', {
      savingsGoal: responseData.monthlyData.savingsGoal,
      savingsHistoryCount: responseData.savingsHistory.length
    });

    res.json(responseData);
  } catch (err) {
    console.error('❌ Error fetching dashboard data:', err);
    res.status(500).json({ message: '❌ Failed to fetch dashboard data' });
  }
});

// Debug endpoint to check session
app.get('/api/debug-session', async (req, res) => {
  try {
    console.log('🔍 Debug session request');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('User ID in session:', req.session.userId);
    
    if (!req.session.userId) {
      return res.status(401).json({ 
        message: '❌ Not logged in',
        sessionExists: !!req.session,
        sessionData: req.session
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: '❌ User not found in database' });
    }

    res.json({
      message: '✅ User is authenticated',
      userId: req.session.userId,
      userName: user.name,
      userEmail: user.email,
      sessionData: req.session
    });
  } catch (err) {
    console.error('Debug session error:', err);
    res.status(500).json({ message: '❌ Debug session error', error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
