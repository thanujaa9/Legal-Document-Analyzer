const User = require('../models/User');

const ensureDemoUser = async () => {
  if (process.env.ENABLE_DEMO_ACCOUNT === 'false') return;
  const email = (process.env.DEMO_EMAIL || 'xyz@gmail.com').toLowerCase();
  const password = process.env.DEMO_PASSWORD || '123456';
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = new User({ name: 'Demo User', email, password });
  } else {
    user.name = 'Demo User';
    user.password = password;
  }
  await user.save();
  console.log('✅ Demo portfolio account ready');
};

module.exports = { ensureDemoUser };
