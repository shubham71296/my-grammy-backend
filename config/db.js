const mongoose = require('mongoose');
const dns = require('dns');

let uri = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    if (uri?.startsWith('mongodb+srv://')) {
      const dnsServers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);

      if (dnsServers.length) {
        dns.setServers(dnsServers);
      }
    }

    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB ;
