// dns-setup.cjs — preloaded via --require before any module
// Forces Google DNS for all SRV/hostname lookups (bypasses ISP blocking of MongoDB Atlas)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
// No output — silent preload
