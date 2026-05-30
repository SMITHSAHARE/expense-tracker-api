function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }
  if (!password || password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body;

  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }
  if (!password || password.trim() === '') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

function validateTransaction(body) {
  const errors = [];
  const { type, amount, date, category_id } = body;

  if (!type || !['income', 'expense'].includes(type)) {
    errors.push({ field: 'type', message: 'Type must be either "income" or "expense"' });
  }
  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }
  if (!date || isNaN(Date.parse(date))) {
    errors.push({ field: 'date', message: 'Date must be a valid date string (e.g. 2024-01-15)' });
  }
  if (category_id !== undefined && (isNaN(Number(category_id)) || Number(category_id) <= 0)) {
    errors.push({ field: 'category_id', message: 'category_id must be a valid positive integer' });
  }

  return errors;
}

function validateCategory(body) {
  const errors = [];
  const { name } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Category name must be at least 2 characters' });
  }

  return errors;
}

function validatePasswordChange(body) {
  const errors = [];
  const { current_password, new_password } = body;

  if (!current_password || current_password.trim() === '') {
    errors.push({ field: 'current_password', message: 'Current password is required' });
  }
  if (!new_password || new_password.length < 6) {
    errors.push({ field: 'new_password', message: 'New password must be at least 6 characters' });
  }

  return errors;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateTransaction,
  validateCategory,
  validatePasswordChange,
};
