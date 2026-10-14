import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '..', 'auth_state.json');

class AuthStore {
  constructor() {
    this.state = {
      defaultPasswordChanged: false,
      adminPassword: null,
      lastPasswordChangeAt: null
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        this.state = { ...this.state, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('[AuthStore] Error reading state file:', err.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AuthStore] Error writing state file:', err.message);
    }
  }

  getState() {
    return { ...this.state };
  }

  markPasswordChanged(newPassword) {
    this.state.defaultPasswordChanged = true;
    this.state.adminPassword = newPassword;
    this.state.lastPasswordChangeAt = new Date().toISOString();
    this.save();
  }
}

export const authStore = new AuthStore();
