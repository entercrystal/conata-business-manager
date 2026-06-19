const storageKey = 'base44_access_token';
const demoUser = { id: 1, email: 'admin@db.demo', name: 'Demo Admin' };

const getToken = () => window.localStorage.getItem(storageKey);
const setDemoToken = (token) => {
  if (token) {
    window.localStorage.setItem(storageKey, token);
  } else {
    window.localStorage.removeItem(storageKey);
  }
};

const ensureAuth = async () => {
  if (!getToken()) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }
  return true;
};

const demoAuth = {
  isAuthenticated: async () => !!getToken(),
  me: async () => {
    await ensureAuth();
    return demoUser;
  },
  loginViaEmailPassword: async (email, password) => {
    console.log('demo fallback loginViaEmailPassword', { email, password });
    if (email === 'admin@db.demo' && password === 'demo1234') {
      const token = 'demo-token';
      setDemoToken(token);
      return { access_token: token };
    }
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  },
  loginWithProvider: async (provider, redirect = '/') => {
    const token = 'demo-token';
    setDemoToken(token);
    if (redirect) {
      window.location.href = redirect;
    }
    return { access_token: token, provider };
  },
  logout: (redirect) => {
    setDemoToken(null);
    if (typeof redirect === 'string' && redirect.length > 0) {
      window.location.href = redirect;
    }
  },
  redirectToLogin: (redirect = '/login') => {
    window.location.href = redirect;
  },
  setToken: async (token) => {
    setDemoToken(token);
    return { access_token: token };
  },
  register: async ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    return { success: true };
  },
  verifyOtp: async ({ email, otpCode }) => {
    if (!email || !otpCode) {
      throw new Error('Email and OTP code are required');
    }
    const validCodes = ['000000', '123456', '111111'];
    if (validCodes.includes(otpCode)) {
      const token = 'demo-token';
      setDemoToken(token);
      return { access_token: token };
    }
    const error = new Error('Invalid verification code');
    error.status = 401;
    throw error;
  },
  resendOtp: async (email) => {
    if (!email) {
      throw new Error('Email is required');
    }
    return { success: true };
  },
  resetPasswordRequest: async (email) => {
    if (!email) {
      throw new Error('Email is required');
    }
    return { success: true };
  },
  resetPassword: async ({ resetToken, newPassword }) => {
    if (!resetToken || !newPassword) {
      throw new Error('Reset token and new password are required');
    }
    return { success: true };
  }
};

const generateId = (() => {
  let nextId = 1000;
  return () => `${Date.now()}-${nextId++}`;
})();

const sortItems = (items, sortBy) => {
  if (!sortBy) return items;
  const desc = sortBy.startsWith('-');
  const key = desc ? sortBy.slice(1) : sortBy;
  return [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'string' && Date.parse(left)) {
      return desc ? Date.parse(right) - Date.parse(left) : Date.parse(left) - Date.parse(right);
    }
    if (typeof left === 'number' && typeof right === 'number') {
      return desc ? right - left : left - right;
    }
    return desc ? String(right).localeCompare(String(left)) : String(left).localeCompare(String(right));
  });
};

const getLimited = (items, limit) => {
  if (typeof limit !== 'number') return items;
  return items.slice(0, limit);
};

const sampleData = {
  MonthlyMetrics: [
    { id: 'm12', month: '2025-07-01', revenue: 5400, expenses: 3200, profit: 2200, productivity_avg: 74, satisfaction_avg: 68, headcount: 12 },
    { id: 'm11', month: '2025-08-01', revenue: 6250, expenses: 3600, profit: 2650, productivity_avg: 76, satisfaction_avg: 70, headcount: 12 },
    { id: 'm10', month: '2025-09-01', revenue: 6800, expenses: 3900, profit: 2900, productivity_avg: 78, satisfaction_avg: 72, headcount: 13 },
    { id: 'm9', month: '2025-10-01', revenue: 7200, expenses: 4050, profit: 3150, productivity_avg: 79, satisfaction_avg: 73, headcount: 13 },
    { id: 'm8', month: '2025-11-01', revenue: 7600, expenses: 4200, profit: 3400, productivity_avg: 80, satisfaction_avg: 75, headcount: 14 },
    { id: 'm7', month: '2025-12-01', revenue: 8100, expenses: 4300, profit: 3800, productivity_avg: 82, satisfaction_avg: 76, headcount: 14 },
    { id: 'm6', month: '2026-01-01', revenue: 8600, expenses: 4500, profit: 4100, productivity_avg: 83, satisfaction_avg: 77, headcount: 15 },
    { id: 'm5', month: '2026-02-01', revenue: 8800, expenses: 4700, profit: 4100, productivity_avg: 82, satisfaction_avg: 78, headcount: 15 },
    { id: 'm4', month: '2026-03-01', revenue: 9100, expenses: 4750, profit: 4350, productivity_avg: 84, satisfaction_avg: 79, headcount: 15 },
    { id: 'm3', month: '2026-04-01', revenue: 9500, expenses: 4900, profit: 4600, productivity_avg: 85, satisfaction_avg: 80, headcount: 16 },
    { id: 'm2', month: '2026-05-01', revenue: 9800, expenses: 5100, profit: 4700, productivity_avg: 86, satisfaction_avg: 81, headcount: 16 },
    { id: 'm1', month: '2026-06-01', revenue: 10400, expenses: 5200, profit: 5200, productivity_avg: 88, satisfaction_avg: 83, headcount: 17 }
  ],
  Worker: [
    { id: 'w1', name: 'Ava Moore', role: 'Growth Strategist', productivity_score: 91, satisfaction_score: 86, hourly_rate: 58, productivity_history: [86, 89, 90, 91] },
    { id: 'w2', name: 'Ethan Shaw', role: 'Operations Lead', productivity_score: 83, satisfaction_score: 80, hourly_rate: 52, productivity_history: [79, 81, 82, 83] },
    { id: 'w3', name: 'Mia Patel', role: 'Customer Success', productivity_score: 79, satisfaction_score: 88, hourly_rate: 48, productivity_history: [76, 78, 79, 79] },
    { id: 'w4', name: 'Leo Kim', role: 'Fraud Analyst', productivity_score: 87, satisfaction_score: 75, hourly_rate: 55, productivity_history: [83, 85, 86, 87] },
    { id: 'w5', name: 'Zoe Carter', role: 'Finance Manager', productivity_score: 82, satisfaction_score: 83, hourly_rate: 62, productivity_history: [80, 81, 81, 82] },
    { id: 'w6', name: 'Noah Brooks', role: 'AI Specialist', productivity_score: 90, satisfaction_score: 81, hourly_rate: 64, productivity_history: [88, 89, 90, 90] }
  ],
  BusinessTransaction: [
    { id: 't1', date: '2026-06-14', category: 'Sales', description: 'Recurring subscription revenue', type: 'income', amount: 4200 },
    { id: 't2', date: '2026-06-11', category: 'Marketing', description: 'Paid social campaign', type: 'expense', amount: 920 },
    { id: 't3', date: '2026-06-08', category: 'Operations', description: 'Cloud hosting invoice', type: 'expense', amount: 740 },
    { id: 't4', date: '2026-06-06', category: 'Sales', description: 'New enterprise contract', type: 'income', amount: 6700 },
    { id: 't5', date: '2026-06-03', category: 'HR', description: 'New team training program', type: 'expense', amount: 1200 },
    { id: 't6', date: '2026-05-28', category: 'Services', description: 'Consulting retainer', type: 'income', amount: 2900 },
    { id: 't7', date: '2026-05-25', category: 'Product', description: 'Software licensing fee', type: 'income', amount: 3100 },
    { id: 't8', date: '2026-05-21', category: 'Equipment', description: 'New laptops', type: 'expense', amount: 1800 },
    { id: 't9', date: '2026-05-18', category: 'Operations', description: 'Office utilities', type: 'expense', amount: 660 },
    { id: 't10', date: '2026-05-15', category: 'Sales', description: 'Partner referral bonus', type: 'income', amount: 1750 }
  ],
  Submission: [
    { id: 's1', worker_id: 'w1', worker_name: 'Ava Moore', title: 'Compromised vendor invoice', created_date: '2026-06-14T09:15:00Z', text: 'I received an invoice that looks fake and the payment details changed. Please advise.', status: 'pending' },
    { id: 's2', worker_id: 'w4', worker_name: 'Leo Kim', title: 'Unusual refund request', created_date: '2026-06-12T11:25:00Z', text: 'Customer requested an urgent refund to a new account. It seems suspicious.', status: 'responded' },
    { id: 's3', worker_id: 'w3', worker_name: 'Mia Patel', title: 'Potential payroll duplicate', created_date: '2026-06-10T08:50:00Z', text: 'Two payroll entries for same contractor in the same week.', status: 'pending' }
  ],
  Message: [
    { id: 'ms1', submission_id: 's2', worker_id: 'w4', sender: 'worker', recipient: 'admin', content: 'The refund request is timing-sensitive and comes from a brand-new account.', created_date: '2026-06-12T11:30:00Z' },
    { id: 'ms2', submission_id: 's2', worker_id: 'w4', sender: 'admin', recipient: 'worker', content: 'Thanks Leo, we are reviewing the request with finance and will pause payment until verified.', created_date: '2026-06-12T12:05:00Z' },
    { id: 'ms3', submission_id: 's3', worker_id: 'w3', sender: 'worker', recipient: 'admin', content: 'I noticed two payroll entries for the same contractor in June. Can we confirm which is correct?', created_date: '2026-06-10T09:05:00Z' }
  ],
  FraudAlert: [
    { id: 'f1', raw_text: 'Suspicious wire transfer of $28,400 from dormant account to offshore vendor.', status: 'pending', created_date: '2026-06-14T14:10:00Z', risk_level: 'high', risk_score: 78 },
    { id: 'f2', raw_text: 'Employee reimbursement claim of $15,700 for travel expenses with altered receipt.', status: 'pending', created_date: '2026-06-12T10:05:00Z', risk_level: 'medium', risk_score: 62 },
    { id: 'f3', raw_text: 'Payment of $52,000 to unapproved vendor with inconsistent invoice format.', status: 'processing', created_date: '2026-06-09T08:24:00Z', risk_level: 'high', risk_score: 80 },
    { id: 'f4', raw_text: 'Multiple rapid refunds issued to a single customer account over 24 hours.', status: 'reviewed', created_date: '2026-06-05T16:30:00Z', risk_level: 'medium', risk_score: 58 }
  ],
  Product: [
    { id: 'p1', name: 'InsightPad Pro', stock: 18, price: 249, category: 'Hardware' },
    { id: 'p2', name: 'TeamFlow Suite', stock: 42, price: 99, category: 'Software' },
    { id: 'p3', name: 'SecureLink Vault', stock: 14, price: 349, category: 'Security' },
    { id: 'p4', name: 'GrowthOps Kit', stock: 29, price: 179, category: 'Services' }
  ],
  FraudCase: [],
  AgentAudit: []
};

const createEntityHandler = (entityName) => ({
  list: async (sortBy, limit) => {
    const items = sampleData[entityName] ? [...sampleData[entityName]] : [];
    if (!sampleData[entityName]) return [];
    const sorted = sortItems(items, sortBy);
    return getLimited(sorted, typeof limit === 'number' ? limit : Number(limit) || undefined);
  },
  filter: async (filterParams = {}, sortBy, limit) => {
    const items = sampleData[entityName] ? [...sampleData[entityName]] : [];
    const filtered = Object.entries(filterParams || {}).length === 0
      ? items
      : items.filter(item => Object.entries(filterParams).every(([key, value]) => item[key] === value));
    const sorted = sortItems(filtered, sortBy);
    return getLimited(sorted, typeof limit === 'number' ? limit : Number(limit) || undefined);
  },
  get: async (id) => {
    const items = sampleData[entityName] || [];
    return items.find((item) => item.id === id) || null;
  },
  create: async (payload) => {
    const record = {
      id: generateId(),
      created_date: payload.created_date || new Date().toISOString(),
      ...payload
    };
    if (!sampleData[entityName]) sampleData[entityName] = [];
    sampleData[entityName].unshift(record);
    return record;
  },
  update: async (id, patch) => {
    const items = sampleData[entityName] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...patch };
    return items[index];
  },
  delete: async (id) => {
    const items = sampleData[entityName] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return { success: false };
    items.splice(index, 1);
    return { success: true };
  },
  bulkCreate: async (records) => {
    const created = [];
    for (const record of records) {
      created.push(await this.create(record));
    }
    return created;
  }
});

const entities = new Proxy({}, {
  get: (_, entityName) => {
    if (sampleData[entityName]) {
      return createEntityHandler(entityName);
    }
    return {
      filter: async () => [],
      list: async () => [],
      get: async () => null,
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
      bulkCreate: async () => []
    };
  }
});

const integrations = {
  Core: {
    InvokeLLM: async ({ prompt }) => {
      return `Demo response for prompt: ${prompt?.slice(0, 120) ?? ''}`;
    }
  }
};

if (!globalThis.__B44_DB__) {
  globalThis.__B44_DB__ = {
    auth: demoAuth,
    entities,
    integrations
  };
} else {
  globalThis.__B44_DB__.auth = {
    ...demoAuth,
    ...(globalThis.__B44_DB__.auth || {})
  };
  globalThis.__B44_DB__.entities = globalThis.__B44_DB__.entities || entities;
  globalThis.__B44_DB__.integrations = globalThis.__B44_DB__.integrations || integrations;
}
