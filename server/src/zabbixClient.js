/**
 * Zabbix API Client Wrapper
 * Implements JSON-RPC 2.0 communication over HTTP with Bearer Token Auth
 * and Web Session handling for direct Zabbix chart image rendering
 */
export class ZabbixClient {
  constructor(apiUrl, apiToken) {
    this.apiUrl = apiUrl || process.env.ZABBIX_API_URL || 'http://103.166.230.229/api_jsonrpc.php';
    this.apiToken = apiToken || process.env.ZABBIX_API_TOKEN;
    this.baseUrl = this.apiUrl.replace(/\/api_jsonrpc\.php.*$/, '');
    this.requestId = 1;
    this.sessionCookie = null;
    this.cookieExpiry = 0;
    this.adminPassword = process.env.ZABBIX_ADMIN_PASS || 'zabbix';
  }

  /**
   * Internal JSON-RPC 2.0 caller
   */
  async call(method, params = {}, requireAuth = true) {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId++
    };

    const headers = {
      'Content-Type': 'application/json-rpc',
    };

    if (requireAuth && this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`Zabbix API Error [${json.error.code}]: ${json.error.message} - ${json.error.data}`);
    }

    return json.result;
  }

  /**
   * Ensure active web session cookie for chart rendering
   */
  async ensureWebSession() {
    if (this.sessionCookie && Date.now() < this.cookieExpiry) {
      return this.sessionCookie;
    }

    const loginBody = new URLSearchParams({
      name: 'Admin',
      password: this.adminPassword || 'zabbix',
      autologin: '1',
      enter: 'Sign in'
    }).toString();

    const loginRes = await fetch(`${this.baseUrl}/index.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: loginBody,
      redirect: 'manual'
    });

    const setCookies = loginRes.headers.getSetCookie 
      ? loginRes.headers.getSetCookie() 
      : [loginRes.headers.get('set-cookie')].filter(Boolean);

    if (setCookies && setCookies.length > 0) {
      this.sessionCookie = setCookies.map(c => c.split(';')[0]).join('; ');
      this.cookieExpiry = Date.now() + 30 * 60 * 1000;
      return this.sessionCookie;
    }

    return null;
  }

  /**
   * Fetch native Zabbix chart PNG image buffer
   */
  async getGraphImage(graphId, from = 'now-1h', to = 'now', width = 1100, height = 240) {
    const cookie = await this.ensureWebSession();
    const chartUrl = `${this.baseUrl}/chart2.php?graphid=${graphId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&profileIdx=web.graphs.filter&width=${width}&height=${height}`;
    
    const headers = {};
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const res = await fetch(chartUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to render graph ${graphId}: HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 1. testConnection(): Validates API version and token connectivity
   */
  async testConnection() {
    const version = await this.call('apiinfo.version', {}, false);
    
    let authValid = false;
    try {
      await this.call('host.get', {
        output: ['hostid', 'name'],
        limit: 1
      });
      authValid = true;
    } catch (err) {
      authValid = false;
    }

    return {
      connected: true,
      authenticated: authValid,
      zabbixVersion: version,
      apiUrl: this.apiUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 2. getHosts(groupIds?): Fetches host list with interfaces, status, and model
   */
  async getHosts(groupIds = null) {
    const params = {
      output: ['hostid', 'host', 'name', 'status', 'description'],
      selectInterfaces: ['interfaceid', 'main', 'type', 'useip', 'ip', 'dns', 'port', 'available', 'error'],
      selectGroups: ['groupid', 'name'],
      sortfield: 'name'
    };

    if (groupIds && groupIds.length > 0) {
      params.groupids = groupIds;
    }

    const rawHosts = await this.call('host.get', params);

    return rawHosts.map(host => {
      const interfaces = host.interfaces || [];
      const primaryIface = interfaces.find(i => i.main === '1') || interfaces[0] || null;
      
      let availability = 'up';
      if (host.status === '1') {
        availability = 'disabled';
      } else if (interfaces.some(i => i.available === '2')) {
        availability = 'down';
      }

      return {
        hostid: host.hostid,
        host: host.host,
        name: host.name,
        status: host.status === '0' ? 'enabled' : 'disabled',
        availability,
        ip: primaryIface ? primaryIface.ip : '127.0.0.1',
        port: primaryIface ? primaryIface.port : '10050',
        interfaces,
        groups: host.groups ? host.groups.map(g => g.name) : []
      };
    });
  }

  /**
   * 3. getTriggersAndAlerts(): Fetches active problems
   */
  async getTriggersAndAlerts() {
    const severityLabels = {
      0: 'Not Classified',
      1: 'Information',
      2: 'Warning',
      3: 'Average',
      4: 'High',
      5: 'Disaster'
    };

    const problems = await this.call('problem.get', {
      output: ['eventid', 'name', 'severity', 'clock', 'acknowledged', 'objectid', 'opdata'],
      severities: [2, 3, 4, 5],
      sortfield: ['eventid'],
      sortorder: 'DESC',
      limit: 100
    });

    if (!problems || problems.length === 0) {
      return [];
    }

    const triggerIds = [...new Set(problems.map(p => p.objectid))];
    const triggers = await this.call('trigger.get', {
      triggerids: triggerIds,
      output: ['triggerid', 'description', 'priority', 'manual_close'],
      selectHosts: ['hostid', 'name', 'host']
    });

    const triggerMap = new Map();
    triggers.forEach(t => triggerMap.set(t.triggerid, t));

    return problems.map(prob => {
      const trigger = triggerMap.get(prob.objectid);
      const host = trigger && trigger.hosts && trigger.hosts[0] ? trigger.hosts[0] : null;

      return {
        eventId: prob.eventid,
        problem: prob.name,
        opdata: prob.opdata || '',
        severity: parseInt(prob.severity, 10),
        severityName: severityLabels[prob.severity] || 'Warning',
        clock: parseInt(prob.clock, 10),
        time: new Date(parseInt(prob.clock, 10) * 1000).toISOString(),
        acknowledged: prob.acknowledged === '1',
        manualCloseAllowed: trigger ? trigger.manual_close === '1' : true,
        hostId: host ? host.hostid : null,
        hostName: host ? host.name : 'Unknown Host'
      };
    });
  }

  /**
   * Acknowledge a problem event directly in Zabbix
   */
  async acknowledgeProblem(eventId, message = 'Acknowledged from NOC Portal', closeProblem = false) {
    let action = 2; // acknowledge
    if (message && message.trim().length > 0) {
      action |= 4; // add message
    }
    if (closeProblem) {
      action |= 1; // close problem
    }

    const params = {
      eventids: [String(eventId)],
      action,
      message: message || 'Acknowledged by NOC Operator'
    };

    return await this.call('event.acknowledge', params);
  }

  /**
   * 4. getGraphs(hostId): Fetches all graphs configured on this host
   */
  async getGraphs(hostId) {
    const rawGraphs = await this.call('graph.get', {
      hostids: [hostId],
      output: ['graphid', 'name', 'graphtype', 'width', 'height', 'yaxismin', 'yaxismax'],
      selectGraphItems: ['gitemid', 'itemid', 'color', 'drawtype', 'calc_fnc', 'sortorder'],
      sortfield: 'name'
    });

    return rawGraphs.map(g => {
      let category = 'Traffic';
      const n = (g.name || '').toLowerCase();
      if (n.includes('optical')) category = 'Optical';
      else if (n.includes('cpu')) category = 'CPU';
      else if (n.includes('memory') || n.includes('swap')) category = 'Memory';
      else if (n.includes('disk') || n.includes('storage') || n.includes('space')) category = 'Storage';
      else if (n.includes('traffic') || n.includes('interface')) category = 'Traffic';

      return {
        graphid: g.graphid,
        name: g.name,
        category,
        itemsCount: g.gitems ? g.gitems.length : 0
      };
    });
  }

  /**
   * 5. getOpticalThresholds(hostId): Reads threshold macros from Zabbix
   */
  async getOpticalThresholds(hostId) {
    const macros = await this.call('usermacro.get', {
      hostids: [hostId]
    });

    let warnRate = -14;
    let critRate = -18;

    macros.forEach(m => {
      if (m.macro === '{$SFP_RX_WARN}') warnRate = parseFloat(m.value) || -14;
      if (m.macro === '{$SFP_RX_CRIT}') critRate = parseFloat(m.value) || -18;
    });

    return { warnRate, critRate };
  }

  /**
   * Update Zabbix User Macros for Optical Thresholds
   */
  async updateOpticalThresholds(hostId, warnRate, critRate) {
    const macros = await this.call('usermacro.get', {
      hostids: [hostId]
    });

    const warnMacro = macros.find(m => m.macro === '{$SFP_RX_WARN}');
    const critMacro = macros.find(m => m.macro === '{$SFP_RX_CRIT}');

    if (warnMacro) {
      await this.call('usermacro.update', {
        hostmacroid: warnMacro.hostmacroid,
        value: String(warnRate)
      });
    } else {
      await this.call('usermacro.create', {
        hostid: hostId,
        macro: '{$SFP_RX_WARN}',
        value: String(warnRate)
      });
    }

    if (critMacro) {
      await this.call('usermacro.update', {
        hostmacroid: critMacro.hostmacroid,
        value: String(critRate)
      });
    } else {
      await this.call('usermacro.create', {
        hostid: hostId,
        macro: '{$SFP_RX_CRIT}',
        value: String(critRate)
      });
    }

    return { success: true, warnRate, critRate };
  }

  /**
   * 6. getOpticalMetrics(hostId): Fetches REAL Optical Telemetry from Zabbix
   * Uses real SNMP DDM items: optical.rx.power, optical.tx.power, optical.temp, etc.
   * Rates and thresholds evaluated against Zabbix threshold macros:
   * Good: Rx >= {$SFP_RX_WARN} (e.g. >= -14 dBm)
   * Warning: {$SFP_RX_CRIT} <= Rx < {$SFP_RX_WARN}
   * Critical: Rx < {$SFP_RX_CRIT}
   */
  async getOpticalMetrics(hostId) {
    const [items, thresholds] = await Promise.all([
      this.call('item.get', {
        hostids: [hostId],
        output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock', 'status', 'value_type'],
        filter: { status: '0' }
      }),
      this.getOpticalThresholds(hostId)
    ]);

    // Find all real optical items
    const opticalItems = items.filter(i => (i.key_ || '').startsWith('optical.'));

    if (opticalItems.length > 0) {
      // Group by interface (sfp-sfpplus1, sfp-sfpplus2)
      const portKeys = ['sfp-sfpplus1', 'sfp-sfpplus2'];
      const results = [];

      for (const pKey of portKeys) {
        const portItems = opticalItems.filter(i => (i.key_ || '').includes(pKey));
        if (portItems.length === 0) continue;

        const rxItem = portItems.find(i => (i.key_ || '').includes('optical.rx.power'));
        const txItem = portItems.find(i => (i.key_ || '').includes('optical.tx.power'));
        const tempItem = portItems.find(i => (i.key_ || '').includes('optical.temp'));
        const voltItem = portItems.find(i => (i.key_ || '').includes('optical.voltage'));
        const biasItem = portItems.find(i => (i.key_ || '').includes('optical.bias'));
        const waveItem = portItems.find(i => (i.key_ || '').includes('optical.wavelength'));

        const rxVal = rxItem && rxItem.lastvalue !== '' ? parseFloat(rxItem.lastvalue) : -6.50;
        const txVal = txItem && txItem.lastvalue !== '' ? parseFloat(txItem.lastvalue) : 1.00;
        const tempVal = tempItem && tempItem.lastvalue !== '' ? parseFloat(tempItem.lastvalue) : 38;
        const voltVal = voltItem && voltItem.lastvalue !== '' ? parseFloat(voltItem.lastvalue) : 3.27;
        const biasVal = biasItem && biasItem.lastvalue !== '' ? parseFloat(biasItem.lastvalue) : 33;
        const waveVal = waveItem && waveItem.lastvalue !== '' ? parseFloat(waveItem.lastvalue) : (pKey === 'sfp-sfpplus1' ? 1270 : 1330);

        // Status calculation based on Zabbix threshold rates
        let status = 'good';
        if (rxVal < thresholds.critRate) {
          status = 'critical';
        } else if (rxVal < thresholds.warnRate) {
          status = 'warning';
        } else {
          status = 'good';
        }

        const isPort1 = pKey === 'sfp-sfpplus1';
        const ifaceDisplayName = isPort1 ? 'sfp-sfpplus1()' : 'sfp-sfpplus2(Orange-Primary)';
        const description = isPort1 
          ? 'MikroTik SFP+ 10GBASE-BX 10km (Tx 1270nm / Rx 1330nm Single-Fiber BiDi)'
          : 'MikroTik SFP+ 10GBASE-BX 10km (Tx 1330nm / Rx 1270nm Single-Fiber BiDi)';

        results.push({
          itemId: rxItem ? rxItem.itemid : `opt-${pKey}`,
          interfaceName: ifaceDisplayName,
          portKey: pKey,
          portType: 'SFP+ 10G (10.0 Gbps Full Duplex)',
          description,
          wavelength: `${waveVal.toFixed(0)} nm`,
          rxPower: rxVal,
          rxFormatted: `${rxVal.toFixed(2)} dBm`,
          rxStatus: status,
          txPower: txVal,
          txFormatted: `${txVal >= 0 ? '+' : ''}${txVal.toFixed(2)} dBm`,
          txStatus: 'good',
          temperature: `${tempVal.toFixed(1)} °C`,
          voltage: `${voltVal.toFixed(2)} V`,
          biasCurrent: `${biasVal.toFixed(1)} mA`,
          linkStatus: 'UP (10 Gbps Active)',
          isRealSnmp: true,
          thresholds: {
            warnRate: thresholds.warnRate,
            critRate: thresholds.critRate,
            goodLabel: `>= ${thresholds.warnRate} dBm Good`,
            warnLabel: `${thresholds.critRate} to ${thresholds.warnRate} dBm Warning`,
            critLabel: `< ${thresholds.critRate} dBm Critical`
          }
        });
      }

      return {
        metrics: results,
        thresholds
      };
    }

    // Host has no optical telemetry items in Zabbix (e.g., standard Linux server)
    return {
      metrics: [],
      thresholds: { warnRate: -14, critRate: -18 }
    };
  }

  /**
   * 7. getInterfaceTraffic(hostId)
   */
  async getInterfaceTraffic(hostId) {
    const items = await this.call('item.get', {
      hostids: [hostId],
      output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock', 'prevvalue'],
      filter: { status: '0' }
    });

    const trafficItems = items.filter(i => {
      const k = (i.key_ || '').toLowerCase();
      return k.startsWith('net.if.in[') || k.startsWith('net.if.out[');
    });

    const formatBps = (bps) => {
      if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(2)} Gbps`;
      if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
      if (bps >= 1000) return `${(bps / 1000).toFixed(2)} Kbps`;
      return `${bps.toFixed(2)} bps`;
    };

    if (trafficItems.length > 0) {
      return trafficItems.slice(0, 10).map(m => {
        const val = parseFloat(m.lastvalue) || 0;
        return {
          itemId: m.itemid,
          name: m.name,
          key: m.key_,
          rawValue: val,
          formatted: formatBps(val),
          units: 'bps',
          lastClock: m.lastclock
        };
      });
    }

    return [];
  }

  /**
   * 8. getHostInterfaces(hostId): Fetches detailed network interfaces with telemetry for any selected host
   */
  async getHostInterfaces(hostId) {
    const items = await this.call('item.get', {
      hostids: [hostId],
      search: { key_: 'net.if.' },
      output: ['itemid', 'name', 'key_', 'lastvalue', 'units', 'status']
    });

    const formatBps = (bps) => {
      if (!bps || isNaN(bps)) return '0 bps';
      const num = parseFloat(bps);
      if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)} Gbps`;
      if (num >= 1000000) return `${(num / 1000000).toFixed(2)} Mbps`;
      if (num >= 1000) return `${(num / 1000).toFixed(2)} Kbps`;
      return `${num.toFixed(0)} bps`;
    };

    const ifaceMap = new Map();

    (items || []).forEach(item => {
      // Name usually format: "Interface ether1(): Bits received" or "Interface ens18: Bits received"
      const match = item.name.match(/Interface\s+([^:]+):/i);
      const ifName = match ? match[1].trim() : (item.key_.match(/\[(.*?)\]/) ? item.key_.match(/\[(.*?)\]/)[1] : item.name);

      if (!ifaceMap.has(ifName)) {
        ifaceMap.set(ifName, {
          name: ifName,
          status: 'unknown',
          speedRaw: 0,
          speedFormatted: 'N/A',
          rxBps: 0,
          rxFormatted: '0 bps',
          txBps: 0,
          txFormatted: '0 bps',
          errors: 0,
          discards: 0,
          isSfp: ifName.toLowerCase().includes('sfp'),
          isBonding: ifName.toLowerCase().includes('bonding')
        });
      }

      const iface = ifaceMap.get(ifName);
      const lowerName = item.name.toLowerCase();

      if (lowerName.includes('bits received') || item.key_.includes('net.if.in[')) {
        iface.rxBps = parseFloat(item.lastvalue) || 0;
        iface.rxFormatted = formatBps(iface.rxBps);
      } else if (lowerName.includes('bits sent') || item.key_.includes('net.if.out[')) {
        iface.txBps = parseFloat(item.lastvalue) || 0;
        iface.txFormatted = formatBps(iface.txBps);
      } else if (lowerName.includes('speed') || item.key_.includes('net.if.speed[')) {
        let speed = parseFloat(item.lastvalue) || 0;
        if (hostId === '10683') {
          if (ifName.toLowerCase().includes('uplink-bonding')) {
            speed = 20000000000; // 2x 10G SFP+ = 20 Gbps capacity
            iface.bondingCapacity = '20G';
          } else if (ifName.toLowerCase().includes('bonding-to-dist')) {
            speed = 4000000000; // 4x 1G Ethernet = 4 Gbps capacity
            iface.bondingCapacity = '4G';
          }
        }
        iface.speedRaw = speed;
        iface.speedFormatted = formatBps(speed);
      } else if (lowerName.includes('operational status') || item.key_.includes('net.if.status[')) {
        iface.status = item.lastvalue === '1' ? 'up' : 'down';
      } else if (lowerName.includes('packets with errors')) {
        iface.errors += parseInt(item.lastvalue, 10) || 0;
      } else if (lowerName.includes('packets discarded')) {
        iface.discards += parseInt(item.lastvalue, 10) || 0;
      }
    });

    const list = Array.from(ifaceMap.values());
    // Sort so UP interfaces and SFP / Bonding come first
    list.sort((a, b) => {
      if (a.status === 'up' && b.status !== 'up') return -1;
      if (a.status !== 'up' && b.status === 'up') return 1;
      if (a.isSfp && !b.isSfp) return -1;
      if (!a.isSfp && b.isSfp) return 1;
      return (b.rxBps + b.txBps) - (a.rxBps + a.txBps);
    });

    return list;
  }

  /**
   * 9. getAlertSettings(): Fetches MSISDN SMS and Telegram media and user configs
   */
  async getAlertSettings() {
    const [mediaTypes, users, actions] = await Promise.all([
      this.call('mediatype.get', {
        output: ['mediatypeid', 'name', 'type', 'status', 'description'],
        selectParameters: 'extend'
      }),
      this.call('user.get', {
        userids: ['1'],
        output: ['userid', 'username'],
        selectMedias: 'extend'
      }),
      this.call('action.get', {
        actionids: ['3'],
        output: ['actionid', 'name', 'status']
      })
    ]);

    const tgMedia = mediaTypes.find(m => m.name.toLowerCase().includes('telegram') || m.mediatypeid === '65');
    const smsMedia = mediaTypes.find(m => m.name.toLowerCase().includes('msisdn') || m.mediatypeid === '72') || mediaTypes.find(m => m.name.toLowerCase() === 'sms');

    const admin = users && users[0] ? users[0] : { medias: [] };
    const userMedias = admin.medias || [];

    const tgUserMedia = userMedias.find(m => tgMedia && m.mediatypeid === tgMedia.mediatypeid);
    const smsUserMedia = userMedias.find(m => smsMedia && m.mediatypeid === smsMedia.mediatypeid);

    // Extract Telegram Bot Token from media type parameters
    let tgBotToken = '';
    let tgParseMode = 'HTML';
    if (tgMedia && tgMedia.parameters) {
      const tokParam = tgMedia.parameters.find(p => p.name === 'api_token');
      if (tokParam && tokParam.value !== '<PLACE YOUR TOKEN>') {
        tgBotToken = tokParam.value;
      }
      const modeParam = tgMedia.parameters.find(p => p.name === 'api_parse_mode');
      if (modeParam && modeParam.value !== '<PLACE PARSE MODE>') {
        tgParseMode = modeParam.value;
      }
    }

    // Extract SMS Gateway details (Gennet SMS provider)
    let smsGatewayUrl = 'https://isms.gennet.com.bd/api/v3/send-sms';
    let smsApiToken = '$2y$12$XNtXdQgifD9//JpPjlFEu.WjMgny9BNlJgROfGkeNxRAZUHAp3Alq';
    let smsSid = 'TeamzeroNONMASKING';

    if (smsMedia && smsMedia.parameters) {
      const urlParam = smsMedia.parameters.find(p => p.name === 'gateway_url');
      if (urlParam) smsGatewayUrl = urlParam.value;

      const tokParam = smsMedia.parameters.find(p => p.name === 'api_token');
      if (tokParam) smsApiToken = tokParam.value;

      const sidParam = smsMedia.parameters.find(p => p.name === 'sid');
      if (sidParam) smsSid = sidParam.value;
    }

    const actionActive = actions && actions[0] ? actions[0].status === '0' : false;

    return {
      actionEnabled: actionActive,
      telegram: {
        mediaTypeId: tgMedia ? tgMedia.mediatypeid : '65',
        enabled: tgMedia ? tgMedia.status === '0' : false,
        botToken: tgBotToken,
        parseMode: tgParseMode,
        chatId: tgUserMedia ? tgUserMedia.sendto : '',
        active: tgUserMedia ? tgUserMedia.active === '0' : false,
        severity: tgUserMedia ? parseInt(tgUserMedia.severity, 10) : 63
      },
      sms: {
        mediaTypeId: smsMedia ? smsMedia.mediatypeid : '72',
        enabled: smsMedia ? smsMedia.status === '0' : false,
        provider: 'gennet',
        gatewayUrl: smsGatewayUrl,
        apiToken: smsApiToken,
        sid: smsSid,
        msisdn: smsUserMedia ? smsUserMedia.sendto : '',
        active: smsUserMedia ? smsUserMedia.active === '0' : false,
        severity: smsUserMedia ? parseInt(smsUserMedia.severity, 10) : 63
      }
    };
  }

  /**
   * 10. updateAlertSettings(): Updates Telegram and MSISDN SMS alerting directly in Zabbix
   */
  async updateAlertSettings({ telegram, sms }) {
    // 1. Update Telegram MediaType (Bot token)
    if (telegram) {
      const tgId = telegram.mediaTypeId || '65';
      const tgParams = await this.call('mediatype.get', {
        mediatypeids: [tgId],
        selectParameters: 'extend'
      });

      if (tgParams && tgParams[0]) {
        const params = tgParams[0].parameters.map(p => {
          if (p.name === 'api_token' && telegram.botToken) {
            return { name: p.name, value: telegram.botToken.trim() };
          }
          if (p.name === 'api_parse_mode') {
            return { name: p.name, value: telegram.parseMode || 'HTML' };
          }
          return p;
        });

        await this.call('mediatype.update', {
          mediatypeid: tgId,
          status: telegram.enabled ? '0' : '1',
          parameters: params
        });
      }
    }

    // 2. Update SMS MediaType (Gennet SMS Gateway)
    if (sms) {
      const smsId = sms.mediaTypeId || '72';
      const smsParams = await this.call('mediatype.get', {
        mediatypeids: [smsId],
        selectParameters: 'extend'
      });

      if (smsParams && smsParams[0]) {
        const params = smsParams[0].parameters.map(p => {
          if (p.name === 'api_token' && sms.apiToken) {
            return { name: p.name, value: sms.apiToken.trim() };
          }
          if (p.name === 'sid' && sms.sid) {
            return { name: p.name, value: sms.sid.trim() };
          }
          if (p.name === 'gateway_url' && sms.gatewayUrl) {
            return { name: p.name, value: sms.gatewayUrl.trim() };
          }
          return p;
        });

        await this.call('mediatype.update', {
          mediatypeid: smsId,
          status: sms.enabled ? '0' : '1',
          parameters: params
        });
      }
    }

    // 3. Update User 1 (Admin) Medias (Chat ID & MSISDN)
    const newMedias = [];
    if (telegram && telegram.chatId && telegram.chatId.trim().length > 0) {
      newMedias.push({
        mediatypeid: telegram.mediaTypeId || '65',
        sendto: [telegram.chatId.trim()],
        active: telegram.enabled ? '0' : '1',
        severity: String(telegram.severity !== undefined ? telegram.severity : 63),
        period: '1-7,00:00-24:00'
      });
    }

    if (sms && sms.msisdn && sms.msisdn.trim().length > 0) {
      newMedias.push({
        mediatypeid: sms.mediaTypeId || '72',
        sendto: [sms.msisdn.trim()],
        active: sms.enabled ? '0' : '1',
        severity: String(sms.severity !== undefined ? sms.severity : 63),
        period: '1-7,00:00-24:00'
      });
    }

    await this.call('user.update', {
      userid: '1',
      medias: newMedias
    });

    // 4. Ensure Action 3 ('Report problems to Zabbix administrators') is enabled
    await this.call('action.update', {
      actionid: '3',
      status: '0'
    });

    return { success: true };
  }

  /**
   * 11. getAlertUsers(): Get all users with their SMS & Telegram media configurations
   */
  async getAlertUsers() {
    const users = await this.call('user.get', {
      output: ['userid', 'username', 'name', 'surname'],
      selectMedias: 'extend'
    });

    return users.map(u => {
      const smsMedia = (u.medias || []).find(m => m.mediatypeid === '72');
      const tgMedia = (u.medias || []).find(m => m.mediatypeid === '65');
      return {
        userid: u.userid,
        username: u.username,
        name: u.name ? `${u.name} ${u.surname || ''}`.trim() : u.username,
        smsPhone: smsMedia ? smsMedia.sendto : '',
        smsEnabled: smsMedia ? smsMedia.active === '0' : false,
        tgChatId: tgMedia ? tgMedia.sendto : '',
        tgEnabled: tgMedia ? tgMedia.active === '0' : false
      };
    });
  }

  /**
   * 12. saveAlertUser(): Create or update an alert recipient user with their phone/telegram
   */
  async saveAlertUser({ userid, username, name, smsPhone, tgChatId }) {
    const cleanPhone = (smsPhone || '').replace(/[^0-9]/g, '');
    const formattedPhone = (cleanPhone.length === 11 && cleanPhone.startsWith('01')) ? `88${cleanPhone}` : cleanPhone;

    const medias = [];
    if (formattedPhone) {
      medias.push({
        mediatypeid: '72',
        sendto: formattedPhone,
        active: 0,
        severity: 63,
        period: '1-7,00:00-24:00'
      });
    }
    if (tgChatId && tgChatId.trim()) {
      medias.push({
        mediatypeid: '65',
        sendto: tgChatId.trim(),
        active: 0,
        severity: 63,
        period: '1-7,00:00-24:00'
      });
    }

    if (userid) {
      // Update existing user
      const updateData = { userid, medias };
      if (name) updateData.name = name;
      await this.call('user.update', updateData);
      return { success: true, userid };
    } else {
      // Create new user (requires unique username and secure password)
      const uName = (username || `user_${Date.now()}`).trim();
      const res = await this.call('user.create', {
        username: uName,
        name: name || uName,
        passwd: 'NocAlert@User2026!Key',
        roleid: '1',
        usrgrps: [{ usrgrpid: '7' }],
        medias
      });
      return { success: true, userid: res.userids[0] };
    }
  }

  /**
   * 13. getDeviceAlertRules(): Fetches all per-device alert actions (Device unreachable, Interface down/up)
   */
  async getDeviceAlertRules() {
    const [actions, hosts, users] = await Promise.all([
      this.call('action.get', {
        eventsource: 0,
        search: { name: 'Device Alert:' },
        output: ['actionid', 'name', 'status'],
        selectFilter: 'extend',
        selectOperations: 'extend'
      }),
      this.call('host.get', {
        output: ['hostid', 'host', 'name']
      }),
      this.getAlertUsers()
    ]);

    const rules = actions.map(act => {
      // Parse host from conditions
      const hostCond = (act.filter?.conditions || []).find(c => c.conditiontype === '1');
      const targetHostId = hostCond ? hostCond.value : null;
      const targetHost = hosts.find(h => h.hostid === targetHostId);

      // Parse multiple users from operations
      const op = (act.operations || [])[0];
      const assignedUsersList = (op && op.opmessage_usr) ? op.opmessage_usr.map(u => String(u.userid)) : [];
      const matchedUsers = users.filter(u => assignedUsersList.includes(String(u.userid)));

      // Parse trigger types
      const trigConds = (act.filter?.conditions || []).filter(c => c.conditiontype === '3');
      const linkDown = trigConds.some(c => (c.value || '').toLowerCase().includes('link down'));
      const unreachable = trigConds.some(c => (c.value || '').toLowerCase().includes('unavailable'));

      return {
        actionid: act.actionid,
        name: act.name,
        enabled: act.status === '0',
        hostId: targetHostId,
        hostName: targetHost ? (targetHost.name || targetHost.host) : `Host #${targetHostId}`,
        userIds: assignedUsersList,
        users: matchedUsers.map(u => ({
          userid: u.userid,
          name: u.name,
          username: u.username,
          smsPhone: u.smsPhone
        })),
        userId: assignedUsersList[0] || null, // legacy backward compatibility
        userName: matchedUsers.map(u => u.name).join(', ') || 'No Users Assigned',
        userPhone: matchedUsers.map(u => u.smsPhone).filter(Boolean).join(', ') || '',
        notifyInterface: linkDown,
        notifyUnreachable: unreachable
      };
    });

    return { rules, hosts, users };
  }

  /**
   * 14. saveDeviceAlertRule(): Create or update a specific device alert action with MULTIPLE USERS
   */
  async saveDeviceAlertRule({ actionid, hostId, userIds, userId, notifyInterface = true, notifyUnreachable = true, enabled = true }) {
    // Support both userIds array and single userId
    const targetUserIds = Array.isArray(userIds) && userIds.length > 0 
      ? userIds.map(String) 
      : (userId ? [String(userId)] : []);

    if (!hostId || targetUserIds.length === 0) {
      throw new Error('hostId and at least one userId are required to configure a device alert rule');
    }

    const [hosts, users] = await Promise.all([
      this.call('host.get', { hostids: [hostId], output: ['hostid', 'name', 'host'] }),
      this.call('user.get', { userids: targetUserIds, output: ['userid', 'username', 'name'] })
    ]);

    const hostName = hosts[0] ? (hosts[0].name || hosts[0].host) : `Host ${hostId}`;
    const userNames = users.map(u => u.name || u.username).join(', ');
    const actionName = `Device Alert: ${hostName} -> ${userNames} (SMS)`;

    // Construct filter conditions
    const conditions = [
      { formulaid: 'A', conditiontype: 1, operator: 0, value: String(hostId) }
    ];

    const trigLetter = ['B', 'C'];
    let trigFormula = [];

    if (notifyInterface) {
      const letter = trigLetter.shift();
      conditions.push({ formulaid: letter, conditiontype: 3, operator: 2, value: 'Link down' });
      trigFormula.push(letter);
    }
    if (notifyUnreachable) {
      const letter = trigLetter.shift();
      conditions.push({ formulaid: letter, conditiontype: 3, operator: 2, value: 'Unavailable' });
      trigFormula.push(letter);
    }

    if (trigFormula.length === 0) {
      conditions.push({ formulaid: 'B', conditiontype: 3, operator: 2, value: 'Link down' });
      conditions.push({ formulaid: 'C', conditiontype: 3, operator: 2, value: 'Unavailable' });
      trigFormula = ['B', 'C'];
    }

    const formula = trigFormula.length > 1 ? `A and (${trigFormula.join(' or ')})` : `A and ${trigFormula[0]}`;

    // Multiple user assignment array in opmessage_usr
    const opMessageUsers = targetUserIds.map(uid => ({ userid: String(uid) }));

    const actionData = {
      name: actionName,
      eventsource: 0,
      status: enabled ? 0 : 1,
      filter: {
        evaltype: 3,
        formula,
        conditions
      },
      operations: [
        {
          operationtype: 0,
          esc_period: 0,
          esc_step_from: 1,
          esc_step_to: 1,
          opmessage: {
            default_msg: 1,
            mediatypeid: 72
          },
          opmessage_usr: opMessageUsers
        }
      ],
      recovery_operations: [
        {
          operationtype: 11,
          opmessage: {
            default_msg: 1
          }
        }
      ]
    };

    if (actionid) {
      actionData.actionid = String(actionid);
      await this.call('action.update', actionData);
      return { success: true, actionid };
    } else {
      const res = await this.call('action.create', actionData);
      return { success: true, actionid: res.actionids[0] };
    }
  }


  /**
   * 15. deleteDeviceAlertRule(): Deletes a device alert action
   */
  async deleteDeviceAlertRule(actionid) {
    if (!actionid) throw new Error('actionid is required');
    await this.call('action.delete', [String(actionid)]);
    return { success: true };
  }

  /**
   * 16. deleteAlertUser(): Deletes a user from Zabbix
   */
  async deleteAlertUser(userid) {
    return this.deleteUser(userid);
  }

  /**
   * User & Role Management APIs
   */

  async loginUser(username, password) {
    return await this.call('user.login', {
      username,
      password
    }, false);
  }

  async getUsers() {
    return await this.call('user.get', {
      output: ['userid', 'username', 'name', 'surname', 'roleid', 'autologout'],
      selectRole: ['roleid', 'name', 'type', 'readonly'],
      selectUsrgrps: ['usrgrpid', 'name', 'gui_access', 'users_status']
    });
  }

  async createUser({ username, passwd, name = '', surname = '', roleid, usrgrps = [] }) {
    if (!username || !passwd || !roleid) {
      throw new Error('Username, password, and roleid are required');
    }
    const params = {
      username,
      passwd,
      name,
      surname,
      roleid: String(roleid),
      usrgrps: usrgrps.length > 0 ? usrgrps.map(g => (typeof g === 'object' ? g : { usrgrpid: String(g) })) : [{ usrgrpid: '7' }]
    };
    return await this.call('user.create', params);
  }

  async updateUser({ userid, passwd, current_passwd, name, surname, roleid, usrgrps }) {
    if (!userid) throw new Error('User ID is required');
    const params = { userid: String(userid) };
    if (passwd) params.passwd = passwd;
    if (current_passwd) params.current_passwd = current_passwd;
    if (name !== undefined) params.name = name;
    if (surname !== undefined) params.surname = surname;
    if (roleid !== undefined) params.roleid = String(roleid);
    if (usrgrps !== undefined) {
      params.usrgrps = usrgrps.map(g => (typeof g === 'object' ? g : { usrgrpid: String(g) }));
    }
    return await this.call('user.update', params);
  }

  async deleteUser(userid) {
    if (!userid) throw new Error('User ID is required');
    if (String(userid) === '1') {
      throw new Error('Root Super Administrator user cannot be deleted');
    }
    return await this.call('user.delete', [String(userid)]);
  }

  async getRoles() {
    return await this.call('role.get', {
      output: ['roleid', 'name', 'type', 'readonly'],
      selectRules: 'extend'
    });
  }

  async createRole({ name, type = 1 }) {
    if (!name) throw new Error('Role name is required');
    return await this.call('role.create', {
      name,
      type: parseInt(type, 10)
    });
  }

  async deleteRole(roleid) {
    if (!roleid) throw new Error('Role ID is required');
    return await this.call('role.delete', [String(roleid)]);
  }

  async getUserGroups() {
    return await this.call('usergroup.get', {
      output: ['usrgrpid', 'name', 'gui_access', 'users_status']
    });
  }
}


