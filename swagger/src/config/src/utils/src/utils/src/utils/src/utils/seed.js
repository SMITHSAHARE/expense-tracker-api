// Seed script — run with: npm run seed
// Populates the DB with 2 sample users and realistic transactions

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, run, get, all, lastInsertRowId } = require('../config/database');

async function seed() {
  console.log('🌱 Starting seed...');

  await getDb(); // Initialize DB and schema

  // Clean existing non-default data
  run(`DELETE FROM transactions`);
  run(`DELETE FROM categories WHERE is_default = 0`);
  run(`DELETE FROM invalidated_tokens`);
  run(`DELETE FROM users`);

  console.log('🧹 Cleaned existing data');

  // Create 2 users
  const password = await bcrypt.hash('password123', 12);

  run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [
    'Rahul Sharma',
    'rahul@example.com',
    password,
  ]);
  const rahulId = lastInsertRowId();

  run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [
    'Priya Mehta',
    'priya@example.com',
    password,
  ]);
  const priyaId = lastInsertRowId();

  console.log(`👤 Created users: rahul@example.com and priya@example.com (password: password123)`);

  // Add custom categories for Rahul
  run(`INSERT INTO categories (name, is_default, user_id) VALUES (?, 0, ?)`, [
    'Petrol',
    rahulId,
  ]);
  const petrolCatId = lastInsertRowId();

  // Get default category IDs
  const categories = all(`SELECT * FROM categories WHERE is_default = 1`);
  const catMap = {};
  categories.forEach(c => {
    catMap[c.name] = c.id;
  });

  // Helper to get a date N days ago
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  // Rahul's transactions (last 3 months)
  const rahulTxns = [
    { type: 'income',  amount: 55000, category_id: null,               date: daysAgo(85), note: 'Monthly salary' },
    { type: 'income',  amount: 55000, category_id: null,               date: daysAgo(55), note: 'Monthly salary' },
    { type: 'income',  amount: 55000, category_id: null,               date: daysAgo(25), note: 'Monthly salary' },
    { type: 'income',  amount: 5000,  category_id: null,               date: daysAgo(40), note: 'Freelance project' },
    { type: 'expense', amount: 8500,  category_id: catMap['Food'],     date: daysAgo(80), note: 'Monthly groceries' },
    { type: 'expense', amount: 1200,  category_id: catMap['Food'],     date: daysAgo(75), note: 'Zomato orders' },
    { type: 'expense', amount: 3200,  category_id: catMap['Bills'],    date: daysAgo(72), note: 'Electricity + internet' },
    { type: 'expense', amount: 2500,  category_id: catMap['Transport'],date: daysAgo(70), note: 'Auto and cab rides' },
    { type: 'expense', amount: 1800,  category_id: petrolCatId,        date: daysAgo(68), note: 'Petrol for bike' },
    { type: 'expense', amount: 6500,  category_id: catMap['Shopping'], date: daysAgo(60), note: 'New clothes' },
    { type: 'expense', amount: 999,   category_id: catMap['Leisure'],  date: daysAgo(50), note: 'Netflix + Spotify' },
    { type: 'expense', amount: 4500,  category_id: catMap['Health'],   date: daysAgo(45), note: 'Doctor visit + medicines' },
    { type: 'expense', amount: 7500,  category_id: catMap['Food'],     date: daysAgo(40), note: 'Monthly groceries' },
    { type: 'expense', amount: 18000, category_id: catMap['Travel'],   date: daysAgo(35), note: 'Trip to Goa' },
    { type: 'expense', amount: 3200,  category_id: catMap['Bills'],    date: daysAgo(30), note: 'Electricity + internet' },
    { type: 'expense', amount: 1500,  category_id: petrolCatId,        date: daysAgo(20), note: 'Petrol' },
    { type: 'expense', amount: 2200,  category_id: catMap['Food'],     date: daysAgo(15), note: 'Dinner with friends' },
    { type: 'expense', amount: 3500,  category_id: catMap['Shopping'], date: daysAgo(10), note: 'Amazon order' },
    { type: 'expense', amount: 800,   category_id: catMap['Transport'],date: daysAgo(5),  note: 'Ola cabs' },
    { type: 'expense', amount: 600,   category_id: catMap['Food'],     date: daysAgo(2),  note: 'Lunch' },
  ];

  rahulTxns.forEach(t => {
    run(
      `INSERT INTO transactions (user_id, type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [rahulId, t.type, t.amount, t.category_id, t.date, t.note]
    );
  });

  // Priya's transactions
  const priyaTxns = [
    { type: 'income',  amount: 72000, category_id: null,               date: daysAgo(85), note: 'Salary' },
    { type: 'income',  amount: 72000, category_id: null,               date: daysAgo(55), note: 'Salary' },
    { type: 'income',  amount: 72000, category_id: null,               date: daysAgo(25), note: 'Salary' },
    { type: 'income',  amount: 12000, category_id: null,               date: daysAgo(30), note: 'Side project payment' },
    { type: 'expense', amount: 22000, category_id: catMap['Bills'],    date: daysAgo(82), note: 'Rent' },
    { type: 'expense', amount: 5500,  category_id: catMap['Food'],     date: daysAgo(78), note: 'Groceries' },
    { type: 'expense', amount: 3000,  category_id: catMap['Health'],   date: daysAgo(65), note: 'Gym membership' },
    { type: 'expense', amount: 9800,  category_id: catMap['Shopping'], date: daysAgo(55), note: 'Myntra haul' },
    { type: 'expense', amount: 22000, category_id: catMap['Bills'],    date: daysAgo(50), note: 'Rent' },
    { type: 'expense', amount: 4200,  category_id: catMap['Food'],     date: daysAgo(42), note: 'Groceries + eating out' },
    { type: 'expense', amount: 25000, category_id: catMap['Travel'],   date: daysAgo(38), note: 'Flight tickets to Bangalore' },
    { type: 'expense', amount: 1299,  category_id: catMap['Leisure'],  date: daysAgo(22), note: 'OTT subscriptions' },
    { type: 'expense', amount: 22000, category_id: catMap['Bills'],    date: daysAgo(20), note: 'Rent' },
    { type: 'expense', amount: 6000,  category_id: catMap['Food'],     date: daysAgo(12), note: 'Groceries' },
    { type: 'expense', amount: 2200,  category_id: catMap['Transport'],date: daysAgo(7),  note: 'Uber this month' },
    { type: 'expense', amount: 4500,  category_id: catMap['Health'],   date: daysAgo(3),  note: 'Dental checkup' },
  ];

  priyaTxns.forEach(t => {
    run(
      `INSERT INTO transactions (user_id, type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [priyaId, t.type, t.amount, t.category_id, t.date, t.note]
    );
  });

  console.log(`💸 Created ${rahulTxns.length} transactions for Rahul`);
  console.log(`💸 Created ${priyaTxns.length} transactions for Priya`);
  console.log('\n✅ Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Email: rahul@example.com  | Password: password123');
  console.log('  Email: priya@example.com  | Password: password123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
