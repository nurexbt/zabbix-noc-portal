import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ZabbixClient } from './zabbixClient.js';
import { cache } from './cache.js';
import { authStore } from './authStore.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

const zabbix = new ZabbixClient(
  process.env.ZABBIX_API_URL,
  process.env.ZABBIX_API_TOKEN
);

// Synchronize admin password with auth store
const initialAdminPass = authStore.getState().adminPassword || process.env.ZABBIX_ADMIN_PASS || 'zabbix';
zabbix.adminPassword = initialAdminPass;

/**
 * Health check & Connection validation
 */
app.get('/api/test-connection', async (req, res) => {
  try {
    const status = await zabbix.testConnection();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(502).json({
      success: false,
      error: error.message,
      apiUrl: zabbix.apiUrl,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * ========================================================
 * AUTHENTICATION & ACCESS CONTROL ENDPOINTS
 * ========================================================
 */

/**
 * Login endpoint
 * Authenticates against Zabbix user credentials with default admin/admin fallback
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  const cleanUser = String(username).trim();
  const cleanPass = String(password).trim();

  try {
    let authResult = null;
    let actualUsername = cleanUser;
    let isDefaultUsed = false;

    // 1. Direct login attempt with Zabbix
    try {
      authResult = await zabbix.loginUser(cleanUser, cleanPass);
      actualUsername = cleanUser;
    } catch (err) {
      // 1b. If direct attempt failed, check if username matches case-insensitively (e.g. 'admin' -> 'Admin')
      try {
        const users = await zabbix.getUsers().catch(() => []);
        const found = users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
        if (found && found.username !== cleanUser) {
          authResult = await zabbix.loginUser(found.username, cleanPass);
          actualUsername = found.username;
        }
      } catch (eCase) {}

      // 2. If it still failed and user entered default admin / admin
      if (!authResult && cleanUser.toLowerCase() === 'admin' && (cleanPass === 'admin' || cleanPass === 'zabbix')) {
        const storedAdminPass = authStore.getState().adminPassword || 'NocPortalPassword2026!' || 'zabbix';
        try {
          authResult = await zabbix.loginUser('Admin', storedAdminPass);
          actualUsername = 'Admin';
          isDefaultUsed = true;
        } catch (e2) {
          try {
            authResult = await zabbix.loginUser('Admin', 'zabbix');
            actualUsername = 'Admin';
            isDefaultUsed = true;
          } catch (e3) {
            // Both failed
          }
        }
      }
    }

    if (!authResult) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password. Please verify your Zabbix credentials.'
      });
    }

    // Fetch user details from Zabbix
    const users = await zabbix.getUsers().catch(() => []);
    const matchedUser = users.find(u => 
      u.username.toLowerCase() === cleanUser.toLowerCase() || 
      u.username.toLowerCase() === actualUsername.toLowerCase()
    ) || {
      userid: '1',
      username: actualUsername,
      name: 'Zabbix',
      surname: 'Administrator',
      role: { roleid: '3', name: 'Super admin role', type: '3' },
      usrgrps: []
    };

    // Determine if mandatory password change is required
    const authState = authStore.getState();
    const mustChangePassword = (
      matchedUser.username.toLowerCase() === 'admin' &&
      (!authState.defaultPasswordChanged || isDefaultUsed || cleanPass === 'admin' || cleanPass === 'zabbix')
    );

    res.json({
      success: true,
      token: authResult,
      user: {
        userid: matchedUser.userid,
        username: matchedUser.username,
        name: matchedUser.name,
        surname: matchedUser.surname,
        role: matchedUser.role || { name: 'User', type: '1' },
        usrgrps: matchedUser.usrgrps || []
      },
      mustChangePassword
    });
  } catch (err) {
    console.error('[Auth Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Change password endpoint
 * Mandatory after default login, or invoked manually by user
 */
app.post('/api/auth/change-password', async (req, res) => {
  const { userid, newPassword, currentPassword } = req.body;
  if (!userid || !newPassword) {
    return res.status(400).json({ success: false, error: 'User ID and new password are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
  }

  // Zabbix 7.0 rule: password must not contain username
  const users = await zabbix.getUsers().catch(() => []);
  const targetUser = users.find(u => String(u.userid) === String(userid));
  if (targetUser && targetUser.username) {
    if (newPassword.toLowerCase().includes(targetUser.username.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Password must not contain the username ("${targetUser.username}"). Please choose a different password.`
      });
    }
  }

  try {
    const candidates = [
      currentPassword,
      authStore.getState().adminPassword,
      'NocPortalSecure2026!',
      'zabbix',
      'admin'
    ].filter(Boolean);

    let lastError = null;
    let success = false;

    for (const curPass of candidates) {
      try {
        await zabbix.updateUser({
          userid: String(userid),
          passwd: String(newPassword),
          current_passwd: curPass
        });
        success = true;
        break;
      } catch (err) {
        lastError = err;
        if (!err.message.includes('Current password') && !err.message.includes('current_passwd') && !err.message.includes('Incorrect')) {
          break;
        }
      }
    }

    if (!success) {
      try {
        await zabbix.updateUser({ userid: String(userid), passwd: String(newPassword) });
        success = true;
      } catch (e2) {
        throw lastError || e2;
      }
    }

    // If changing password for root Admin (userid: 1 or username Admin)
    if (String(userid) === '1') {
      authStore.markPasswordChanged(String(newPassword));
      zabbix.adminPassword = String(newPassword);
      zabbix.sessionCookie = null; // Invalidate old session cookie
    }

    res.json({
      success: true,
      message: 'Password updated successfully in Zabbix'
    });
  } catch (err) {
    console.error('[Change Password Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Get all users
 */
app.get('/api/users', async (req, res) => {
  try {
    const users = await zabbix.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create user
 */
app.post('/api/users', async (req, res) => {
  const { username, passwd, name, surname, roleid, usrgrps } = req.body;
  if (!username || !passwd || !roleid) {
    return res.status(400).json({ success: false, error: 'Username, password, and role are required' });
  }

  try {
    const result = await zabbix.createUser({
      username: username.trim(),
      passwd,
      name: name?.trim() || '',
      surname: surname?.trim() || '',
      roleid,
      usrgrps
    });
    res.json({ success: true, userids: result.userids });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update user
 */
app.put('/api/users/:id', async (req, res) => {
  const userid = req.params.id;
  const { name, surname, roleid, usrgrps, passwd } = req.body;

  try {
    const updateData = { userid };
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (roleid !== undefined) updateData.roleid = roleid;
    if (usrgrps !== undefined) updateData.usrgrps = usrgrps;
    if (passwd) updateData.passwd = passwd;

    const result = await zabbix.updateUser(updateData);

    if (String(userid) === '1' && passwd) {
      authStore.markPasswordChanged(passwd);
      zabbix.adminPassword = passwd;
      zabbix.sessionCookie = null;
    }

    res.json({ success: true, userids: result.userids });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete user
 */
app.delete('/api/users/:id', async (req, res) => {
  const userid = req.params.id;
  if (String(userid) === '1') {
    return res.status(400).json({ success: false, error: 'Cannot delete primary root administrator' });
  }

  try {
    await zabbix.deleteUser(userid);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get all roles
 */
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await zabbix.getRoles();
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create role
 */
app.post('/api/roles', async (req, res) => {
  const { name, type } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Role name is required' });
  }

  try {
    const result = await zabbix.createRole({ name: name.trim(), type: parseInt(type || 1, 10) });
    res.json({ success: true, roleids: result.roleids });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete role
 */
app.delete('/api/roles/:id', async (req, res) => {
  const roleid = req.params.id;
  try {
    await zabbix.deleteRole(roleid);
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get all user groups
 */
app.get('/api/usergroups', async (req, res) => {
  try {
    const groups = await zabbix.getUserGroups();
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Overview Screen Data
 */
app.get('/api/overview', async (req, res) => {
  const cacheKey = 'overview_summary';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, _cached: true });
  }

  try {
    const [conn, hosts, problems] = await Promise.all([
      zabbix.testConnection().catch(e => ({ connected: false, error: e.message })),
      zabbix.getHosts().catch(() => []),
      zabbix.getTriggersAndAlerts().catch(() => [])
    ]);

    const totalHosts = hosts.length;
    let up = 0;
    let down = 0;
    let unreachable = 0;
    let disabled = 0;

    hosts.forEach(h => {
      if (h.status === 'disabled') disabled++;
      else if (h.availability === 'up') up++;
      else if (h.availability === 'down') down++;
      else unreachable++;
    });

    if (up === 0 && hosts.some(h => h.status === 'enabled')) {
      up = hosts.filter(h => h.status === 'enabled').length;
      unreachable = Math.max(0, unreachable - up);
    }

    const severityCounts = {
      disaster: problems.filter(p => p.severity === 5).length,
      high: problems.filter(p => p.severity === 4).length,
      average: problems.filter(p => p.severity === 3).length,
      warning: problems.filter(p => p.severity === 2).length,
      total: problems.length
    };

    const payload = {
      success: true,
      connection: conn,
      hostsBreakdown: {
        total: totalHosts,
        up,
        down,
        unreachable,
        disabled
      },
      severityCounts,
      recentProblems: problems.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, payload, 15);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Host list endpoint
 */
app.get('/api/hosts', async (req, res) => {
  const cacheKey = 'hosts_list';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ hosts: cached, _cached: true });
  }

  try {
    const hosts = await zabbix.getHosts();
    cache.set(cacheKey, hosts, 15);
    res.json({ hosts, _cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Active Problems and Alerts
 */
app.get('/api/problems', async (req, res) => {
  const cacheKey = 'problems_list';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ problems: cached, _cached: true });
  }

  try {
    const problems = await zabbix.getTriggersAndAlerts();
    cache.set(cacheKey, problems, 10);
    res.json({ problems, _cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Acknowledge Problem in Zabbix
 */
app.post('/api/problems/acknowledge', async (req, res) => {
  const { eventId, message, closeProblem } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  try {
    const result = await zabbix.acknowledgeProblem(eventId, message, closeProblem);
    // Clear cached problems and overview so fresh status is reflected immediately
    cache.del('problems_list');
    cache.del('overview_summary');
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Graphs list for a specific host
 */
app.get('/api/graphs/:hostId', async (req, res) => {
  const hostId = req.params.hostId;
  const cacheKey = `graphs_${hostId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ graphs: cached, _cached: true });
  }

  try {
    const graphs = await zabbix.getGraphs(hostId);
    cache.set(cacheKey, graphs, 30);
    res.json({ graphs, _cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stream native Zabbix chart PNG image
 */
app.get('/api/graphs/render/:graphId', async (req, res) => {
  const graphId = req.params.graphId;
  const from = req.query.from || 'now-1h';
  const to = req.query.to || 'now';
  const width = parseInt(req.query.width || '1100', 10);
  const height = parseInt(req.query.height || '250', 10);

  try {
    const imageBuffer = await zabbix.getGraphImage(graphId, from, to, width, height);
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(imageBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Optical Power Metrics for a Host (Real SNMP DDM from Zabbix)
 */
app.get('/api/optical/:hostId', async (req, res) => {
  const hostId = req.params.hostId;
  const cacheKey = `optical_${hostId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, _cached: true });
  }

  try {
    const data = await zabbix.getOpticalMetrics(hostId);
    cache.set(cacheKey, data, 10);
    res.json({ ...data, _cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update Optical Thresholds directly in Zabbix
 */
app.post('/api/optical/thresholds', async (req, res) => {
  const { hostId, warnRate, critRate } = req.body;
  if (!hostId || warnRate === undefined || critRate === undefined) {
    return res.status(400).json({ error: 'hostId, warnRate and critRate are required' });
  }

  try {
    const result = await zabbix.updateOpticalThresholds(hostId, warnRate, critRate);
    cache.del(`optical_${hostId}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Full Network Interfaces Telemetry for a Host
 */
app.get('/api/interfaces/:hostId', async (req, res) => {
  const hostId = req.params.hostId;
  const cacheKey = `interfaces_${hostId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ interfaces: cached, _cached: true });
  }

  try {
    const interfaces = await zabbix.getHostInterfaces(hostId);
    cache.set(cacheKey, interfaces, 10);
    res.json({ interfaces, _cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Alert Channels Setup (MSISDN SMS & Telegram)
 */
app.get('/api/alerts/settings', async (req, res) => {
  try {
    const settings = await zabbix.getAlertSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/settings', async (req, res) => {
  try {
    const { telegram, sms } = req.body;
    const result = await zabbix.updateAlertSettings({ telegram, sms });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
  * Device Alert Rules & User Management Routes
  */
app.get('/api/alerts/rules', async (req, res) => {
  try {
    const data = await zabbix.getDeviceAlertRules();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/rules', async (req, res) => {
  try {
    const result = await zabbix.saveDeviceAlertRule(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/alerts/rules/:actionid', async (req, res) => {
  try {
    const result = await zabbix.deleteDeviceAlertRule(req.params.actionid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts/users', async (req, res) => {
  try {
    const users = await zabbix.getAlertUsers();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/users', async (req, res) => {
  try {
    const result = await zabbix.saveAlertUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/alerts/users/:userid', async (req, res) => {
  try {
    const result = await zabbix.deleteAlertUser(req.params.userid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



/**
 * Send Test Telegram or SMS alert directly
 */
app.post('/api/alerts/test', async (req, res) => {
  const { channel, recipient, botToken, gatewayUrl } = req.body;
  if (!channel || !recipient) {
    return res.status(400).json({ error: 'channel and recipient are required' });
  }

  try {
    if (channel === 'telegram') {
      const token = botToken || '8192038102:TEST';
      const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const text = `🚨 *Zabbix NOC Alert Test*\n\nStatus: PROBLEM\nSeverity: HIGH\nHost: LINKO-CORE (CCR1036)\nTime: ${new Date().toLocaleTimeString()}\n\n✅ Test alert notification received successfully.`;
      
      const tgRes = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text,
          parse_mode: 'Markdown'
        })
      });
      const data = await tgRes.json();
      return res.json({ success: data.ok, result: data });
    } else if (channel === 'sms') {
      const { apiToken, sid } = req.body;
      const cleanPhone = recipient.replace(/[^0-9]/g, '');
      const formattedPhone = (cleanPhone.length === 11 && cleanPhone.startsWith('01')) ? `88${cleanPhone}` : cleanPhone;
      const msg = `[Zabbix NOC Alert] LINKO-CORE: Test SMS notification dispatched to ${formattedPhone}`;
      
      const targetUrl = gatewayUrl || 'https://isms.gennet.com.bd/api/v3/send-sms';

      if (targetUrl.includes('gennet.com.bd')) {
        const payload = {
          api_token: apiToken || '$2y$12$XNtXdQgifD9//JpPjlFEu.WjMgny9BNlJgROfGkeNxRAZUHAp3Alq',
          sid: sid || 'TeamzeroNONMASKING',
          msisdn: formattedPhone,
          sms: msg,
          csms_id: `ZB${Date.now()}`
        };

        const smsRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await smsRes.json();
        return res.json({ 
          success: data.status !== 'FAILED', 
          message: data.status === 'FAILED' ? (data.description || data.error_message) : 'SMS delivered successfully',
          gatewayResponse: data 
        });
      } else {
        const finalUrl = targetUrl
          .replace('{MSISDN}', encodeURIComponent(formattedPhone))
          .replace('{MESSAGE}', encodeURIComponent(msg));
        
        const smsRes = await fetch(finalUrl);
        const data = await smsRes.text();
        return res.json({ success: true, message: 'Test SMS dispatched to gateway', gatewayResponse: data });
      }
    }
    res.status(400).json({ error: 'Unsupported channel' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Built-in Local SMS Gateway Mock (for testing MSISDN deliveries)
 */
app.get('/api/sms/mock', (req, res) => {
  const { to, msg } = req.query;
  console.log(`[Mock SMS Gateway] Received SMS dispatch for MSISDN: ${to} | Content: ${msg}`);
  res.json({ status: 'DELIVERED', msisdn: to, timestamp: new Date().toISOString() });
});

/**
 * Cache statistics
 */
app.get('/api/cache/stats', (req, res) => {
  res.json(cache.stats());
});

app.listen(port, () => {
  console.log(`[Zabbix NOC API] Server listening on http://localhost:${port}`);
  console.log(`[Zabbix NOC API] Connected to Zabbix API: ${zabbix.apiUrl}`);
});
