const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config/loyalty-config.json');

class LoyaltyConfigService {
  getConfig() {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error("Failed to read loyalty config, using defaults:", err);
      return { earnRate: 100, redeemValue: 1 };
    }
  }

  updateConfig(newConfig) {
    try {
      const currentConfig = this.getConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
      return updatedConfig;
    } catch (err) {
      console.error("Failed to write loyalty config:", err);
      throw new Error("Could not update loyalty configuration");
    }
  }
}

module.exports = new LoyaltyConfigService();
