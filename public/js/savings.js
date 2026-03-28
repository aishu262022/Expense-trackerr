// Savings page with backend integration
console.log('🎯 Savings.js loaded successfully!');
let savingsGoals = [];
let user = null;

// Initialize savings page
async function initializeSavings() {
  console.log('🚀 Initializing savings page...');
  try {
    // Check authentication
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      console.log('❌ No user found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    user = JSON.parse(storedUser);
    console.log('✅ User authenticated for savings:', user.name);

    // Update user interface
    console.log('👤 Updating user interface...');
    updateUserInterface();
    
    // Load savings goals from database
    console.log('📊 Loading savings goals...');
    await loadSavingsGoals();
    
    // Render savings goals
    console.log('🎨 Rendering savings goals...');
    renderSavingsGoals();
    
    // Set up event listeners
    console.log('🔧 Setting up event listeners...');
    setupEventListeners();
    
    console.log('✅ Savings page initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing savings page:', error);
    showToast('Failed to load savings data', 'error');
  }
}

// Update user interface elements
function updateUserInterface() {
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

// Load savings goals from database
async function loadSavingsGoals() {
  try {
    console.log('📡 Fetching savings goals from /api/savings...');
    const response = await fetch('/api/savings', {
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
      throw new Error(errorData.message || 'Failed to fetch savings goals');
    }

    savingsGoals = await response.json();
    console.log('✅ Loaded savings goals:', savingsGoals);
    
  } catch (error) {
    console.error('❌ Error loading savings goals:', error);
    showToast(`Failed to load savings goals: ${error.message}`, 'error');
    savingsGoals = [];
  }
}

// Render savings goals
function renderSavingsGoals() {
  const grid = document.getElementById('savingsGoalsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  
  // Update summary cards
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + (goal.savedAmount || 0), 0);
  const plansCount = savingsGoals.length;
  
  const totalSavingsValue = document.getElementById('totalSavingsValue');
  const plansValue = document.getElementById('plansValue');
  const totalSavingsHeader = document.querySelector('.savings-total');
  
  if (totalSavingsValue) totalSavingsValue.textContent = `₹${totalSavings.toLocaleString()}`;
  if (plansValue) plansValue.textContent = plansCount;
  if (totalSavingsHeader) totalSavingsHeader.textContent = `Total Saved ₹${totalSavings.toLocaleString()}`;

  if (savingsGoals.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 80px 20px; color: #7B8A97; grid-column: 1 / -1;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🎯</div>
        <div style="font-size: 1.5rem; margin-bottom: 12px; font-weight: 600;">No savings yet</div>
        <div style="font-size: 1rem; opacity: 0.8;">Click "Add New Goal" to get started!</div>
      </div>
    `;
    return;
  }

  savingsGoals.forEach((goal, idx) => {
    const card = document.createElement('div');
    card.className = 'savings-goal-card';
    
    const saved = goal.savedAmount || 0;
    const total = goal.targetAmount;
    const percent = total > 0 ? Math.min(100, (saved / total) * 100) : 0;
    const remaining = Math.max(0, total - saved);
    const targetDate = new Date(goal.targetDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Determine status
    const isCompleted = saved >= total && total > 0;
    const statusText = isCompleted ? 'Completed' : 'Active';
    const statusColor = isCompleted ? '#1DE9B6' : '#00BFFF';
    
    card.innerHTML = `
      <div class="savings-goal-header">
        <span class="savings-goal-dot" style="background:${statusColor};"></span>
        <span class="savings-goal-title">${goal.title}</span>
        <span class="savings-goal-sub">Target: ${targetDate}</span>
        <span style="color:${statusColor};font-size:0.8rem;margin-left:8px;font-weight:600;">${statusText}</span>
      </div>
      <div class="savings-goal-progress-bar-bg">
        <div class="savings-goal-progress-bar" style="width:${percent}%"></div>
      </div>
      <div class="savings-goal-info">
        <span>Saved ₹${saved.toLocaleString()}</span>
        <span style="color:#7B8A97;">/</span>
        <span>₹${total.toLocaleString()}</span>
        <span style="color: ${remaining === 0 ? '#00BFFF' : '#2C3E50'}; font-weight: ${remaining === 0 ? '600' : '400'};">Remaining ₹${remaining.toLocaleString()}</span>
        <span>Target Date: ${targetDate}</span>
      </div>
      <div class="savings-goal-actions">
        <button class="savings-goal-btn savings-goal-btn-cyan add-money-btn">Add Money</button>
        <button class="savings-goal-btn savings-goal-btn-gray remove-money-btn">Remove Money</button>
        <button class="savings-goal-btn savings-goal-btn-gray delete-goal-btn">Delete</button>
      </div>
      <div class="add-money-form" style="display:none;margin-top:10px;">
        <input type="number" min="1" placeholder="Enter amount" class="add-money-input" style="padding:7px 12px;border-radius:6px;border:1px solid #ccc;width:120px;">
        <button class="savings-goal-btn savings-goal-btn-cyan confirm-add-money" style="margin-left:8px;">Add</button>
        <button class="savings-goal-btn savings-goal-btn-gray cancel-add-money" style="margin-left:4px;">Cancel</button>
      </div>
      <div class="remove-money-form" style="display:none;margin-top:10px;">
        <input type="number" min="1" placeholder="Enter amount" class="remove-money-input" style="padding:7px 12px;border-radius:6px;border:1px solid #ccc;width:120px;">
        <button class="savings-goal-btn savings-goal-btn-cyan confirm-remove-money" style="margin-left:8px;">Remove</button>
        <button class="savings-goal-btn savings-goal-btn-gray cancel-remove-money" style="margin-left:4px;">Cancel</button>
      </div>
      <div class="goal-congrats" style="display:none;text-align:center;margin-top:10px;padding:15px;background:linear-gradient(135deg,#00BFFF,#1DE9B6);color:#fff;border-radius:12px;font-weight:700;box-shadow:0 4px 16px rgba(0,191,255,0.3);">
        <div style="font-size:2rem;margin-bottom:8px;">🎉</div>
        <div style="font-size:1.2rem;margin-bottom:4px;">Congratulations!</div>
        <div style="font-size:0.9rem;opacity:0.9;">Goal Achieved!</div>
      </div>
      <canvas class="confetti-canvas" style="display:none;position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:10;"></canvas>
    `;
    
    // Add Money logic (like original main.js)
    const addBtn = card.querySelector('.add-money-btn');
    const addFormDiv = card.querySelector('.add-money-form');
    const addInput = card.querySelector('.add-money-input');
    const confirmAddBtn = card.querySelector('.confirm-add-money');
    const cancelAddBtn = card.querySelector('.cancel-add-money');
    
    addBtn.onclick = () => { 
      addFormDiv.style.display = 'inline-block'; 
      addInput.value = ''; 
      addInput.focus(); 
    };
    
    cancelAddBtn.onclick = () => { 
      addFormDiv.style.display = 'none'; 
    };
    
    confirmAddBtn.onclick = async () => {
      const val = Number(addInput.value);
      if (!val || val < 1) { 
        addInput.focus(); 
        return; 
      }
      
      console.log('💰 Adding money to goal:', goal.title, 'Amount:', val);
      await updateGoalAmount(goal._id, val, 'add');
      addFormDiv.style.display = 'none';
    };
    
    // Remove Money logic (like original main.js)
    const removeBtn = card.querySelector('.remove-money-btn');
    const removeFormDiv = card.querySelector('.remove-money-form');
    const removeInput = card.querySelector('.remove-money-input');
    const confirmRemoveBtn = card.querySelector('.confirm-remove-money');
    const cancelRemoveBtn = card.querySelector('.cancel-remove-money');
    
    removeBtn.onclick = () => { 
      removeFormDiv.style.display = 'inline-block'; 
      removeInput.value = ''; 
      removeInput.focus(); 
    };
    
    cancelRemoveBtn.onclick = () => { 
      removeFormDiv.style.display = 'none'; 
    };
    
    confirmRemoveBtn.onclick = async () => {
      const val = Number(removeInput.value);
      if (!val || val < 1) { 
        removeInput.focus(); 
        return; 
      }
      
      console.log('💰 Removing money from goal:', goal.title, 'Amount:', val);
      await updateGoalAmount(goal._id, val, 'remove');
      removeFormDiv.style.display = 'none';
    };
    
    // Delete logic
    card.querySelector('.delete-goal-btn').onclick = async function() {
      if (confirm('Are you sure you want to delete this savings goal?')) {
        await deleteGoal(goal._id);
      }
    };
    
    grid.appendChild(card);
    
    // Check if goal is completed and trigger celebration
    if (isCompleted) {
      const celebrationFlag = localStorage.getItem(`celebrated_goal_${goal._id}`);
      if (!celebrationFlag) {
        setTimeout(() => {
          const congrats = card.querySelector('.goal-congrats');
          const canvas = card.querySelector('.confetti-canvas');
          if (congrats && canvas) {
            congrats.style.display = 'block';
            canvas.style.display = 'block';
            confettiBurst(canvas);
            localStorage.setItem(`celebrated_goal_${goal._id}`, 'true');
            console.log(`🎉 Celebration triggered for goal: ${goal.title}`);
            
            setTimeout(() => {
              congrats.style.display = 'none';
              canvas.style.display = 'none';
            }, 3000);
          }
        }, 500);
      }
    } else if (saved < total && total > 0) {
      // Reset the celebration flag if goal is no longer completed
      localStorage.removeItem(`celebrated_goal_${goal._id}`);
      console.log(`🔄 Celebration flag reset for goal: ${goal.title} (no longer completed)`);
    }
  });
}

// Set up event listeners
function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  // Add new goal button
  const addBtn = document.getElementById('addSavingsBtn');
  const modal = document.getElementById('savingsModal');
  const closeModalBtn = document.getElementById('closeSavingsModal');
  const form = document.getElementById('savingsForm');

  console.log('🔍 Found elements:', { 
    addBtn: !!addBtn, 
    modal: !!modal, 
    closeModalBtn: !!closeModalBtn, 
    form: !!form 
  });

  if (addBtn && modal && closeModalBtn && form) {
    addBtn.onclick = () => { 
      console.log('➕ Add button clicked');
      modal.style.display = 'flex'; 
    };
    
    closeModalBtn.onclick = () => { 
      console.log('❌ Close button clicked');
      modal.style.display = 'none'; 
      form.reset(); 
    };
    
    form.onsubmit = async function(e) {
      e.preventDefault();
      console.log('🎯 Form submitted - handleAddGoal called');
      
      const title = document.getElementById('savingsFor').value;
      const targetAmount = document.getElementById('savingsAmount').value;
      const targetDate = document.getElementById('savingsDate').value;

      console.log('📝 Form data:', { title, targetAmount, targetDate });

      if (!title || !targetAmount || !targetDate) {
        showToast('Please fill in all fields', 'error');
        return;
      }

      try {
        console.log('🚀 Sending request to /api/savings');
        const response = await fetch('/api/savings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            targetAmount: Number(targetAmount),
            targetDate
          })
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Server error:', errorData);
          throw new Error(errorData.message || 'Failed to create savings goal');
        }

        const newGoal = await response.json();
        console.log('✅ New goal created:', newGoal);
        savingsGoals.push(newGoal);
        
        // Reset form and close modal
        form.reset();
        modal.style.display = 'none';
        
        // Re-render goals
        renderSavingsGoals();
        
        showToast('Savings goal created successfully!', 'success');
        
      } catch (error) {
        console.error('❌ Error creating savings goal:', error);
        showToast(`Failed to create savings goal: ${error.message}`, 'error');
      }
    };
  }

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

  // Smart Savings Tips functionality
  const tips = [
    'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
    'Set up automatic transfers to your savings account.',
    'Track your expenses to identify spending patterns.',
    'Round up purchases and save the difference.',
    'Cook at home more often to cut down on expenses.',
    'Use cash for discretionary spending to avoid overspending.',
    'Compare prices before big purchases to get the best deal.'
  ];
  
  const tipElem = document.querySelector('.savings-tip');
  const prevBtn = document.querySelectorAll('.savings-tips-btn')[0];
  const nextBtn = document.querySelectorAll('.savings-tips-btn')[1];
  const pageElem = document.querySelector('.savings-tips-page');
  
  if (tipElem && prevBtn && nextBtn && pageElem) {
    let idx = Math.floor(Math.random() * tips.length);
    
    function updateTip() {
      tipElem.textContent = tips[idx];
      pageElem.textContent = `${idx + 1} of ${tips.length}`;
    }
    
    prevBtn.addEventListener('click', function() {
      idx = (idx - 1 + tips.length) % tips.length;
      updateTip();
    });
    
    nextBtn.addEventListener('click', function() {
      idx = (idx + 1) % tips.length;
      updateTip();
    });
    
    updateTip();
  }
}

// Update goal amount
async function updateGoalAmount(goalId, amount, action) {
  try {
    console.log('🔄 updateGoalAmount called with:', { goalId, amount, action });
    
    const goal = savingsGoals.find(g => g._id === goalId);
    if (!goal) {
      console.log('❌ Goal not found in savingsGoals array');
      return;
    }

    console.log('✅ Found goal:', goal.title);
    console.log('💰 Current saved amount:', goal.savedAmount);

    let newAmount = goal.savedAmount;
    if (action === 'add') {
      newAmount += amount;
    } else if (action === 'remove') {
      newAmount = Math.max(0, newAmount - amount);
    }

    console.log('💰 New amount will be:', newAmount);
    console.log('🚀 Sending PUT request to /api/savings/' + goalId);

    const response = await fetch(`/api/savings/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        savedAmount: newAmount
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server error:', errorData);
      throw new Error('Failed to update savings goal');
    }

    const updatedGoal = await response.json();
    console.log('✅ Updated goal received:', updatedGoal);
    
    const index = savingsGoals.findIndex(g => g._id === goalId);
    if (index !== -1) {
      savingsGoals[index] = updatedGoal;
      console.log('✅ Updated goal in local array');
    }

    console.log('🎨 Re-rendering savings goals...');
    renderSavingsGoals();
    showToast(`Money ${action === 'add' ? 'added' : 'removed'} successfully!`, 'success');
    
  } catch (error) {
    console.error('❌ Error updating savings goal:', error);
    showToast('Failed to update savings goal', 'error');
  }
}

// Delete goal
async function deleteGoal(goalId) {
  try {
    const response = await fetch(`/api/savings/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete savings goal');
    }

    savingsGoals = savingsGoals.filter(g => g._id !== goalId);
    renderSavingsGoals();
    showToast('Savings goal deleted successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Error deleting savings goal:', error);
    showToast('Failed to delete savings goal', 'error');
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
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    localStorage.removeItem('user');
    window.location.href = 'login.html?logout=true';
  } catch (error) {
    console.error('Logout error:', error);
    localStorage.removeItem('user');
    window.location.href = 'login.html?logout=true';
  }
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

// Confetti animation function (from main.js)
function confettiBurst(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#00BFFF', '#1DE9B6', '#FFD700', '#FF6B6B', '#B39DDB'];
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + 10;
      this.vx = (Math.random() - 0.5) * 8;
      this.vy = -Math.random() * 15 - 5;
      this.size = Math.random() * 8 + 4;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.5; // gravity
      this.rotation += this.rotationSpeed;
    }
    
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
      ctx.restore();
    }
  }
  
  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      
      if (particles[i].y > canvas.height + 20) {
        particles.splice(i, 1);
      }
    }
    
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// Make functions globally available
window.toggleDropdown = toggleDropdown;
window.handleLogout = handleLogout;
window.showToast = showToast;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSavings);
