class PresenceService {
  constructor() {
    this.onlineUsers = new Map();
  }

  updatePresence(userId) {
    if (!userId) return;
    this.onlineUsers.set(userId, Date.now());
  }

  isOnline(userId) {
    const lastActive = this.onlineUsers.get(userId);
    if (!lastActive) return false;
    // Consider offline if inactive for 5 minutes (300000 ms)
    return Date.now() - lastActive < 300000;
  }
}

module.exports = new PresenceService();
