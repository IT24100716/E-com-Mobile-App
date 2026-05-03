const prisma = require("../../config/prisma");
const autoReplyRules = require("./chat.rules");
const presenceService = require("./presence.service");

class ChatService {
  async sendMessage(data) {
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: data.senderId,
        senderName: data.senderName,
        receiverId: data.receiverId,
        message: data.message,
        isAdmin: data.isAdmin || false,
        imageUrl: data.imageUrl || null,
      },
    });

    // Handle Auto-Replies if message is from a customer
    if (!data.isAdmin && data.message) {
      await this.handleAutoReply(data.senderId, data.message);
    }

    return chatMessage;
  }

  async handleAutoReply(customerId, userMessage) {
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // Find all rules that match the message
    const matchingRules = autoReplyRules.filter(rule => 
      rule.keywords.some(keyword => normalizedMessage.includes(keyword.toLowerCase()))
    );

    if (matchingRules.length > 0) {
      // Check for cooldown (2 minutes to allow quick repeated use)
      const cooldownAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      // Try to find the first matching rule that is NOT on cooldown
      for (const rule of matchingRules) {
        const recentReply = await prisma.chatMessage.findFirst({
          where: {
            receiverId: customerId,
            senderName: "System",
            message: rule.response,
            createdAt: { gte: cooldownAgo }
          }
        });

        if (!recentReply) {
          // Send the first available automated reply
          await prisma.chatMessage.create({
            data: {
              senderId: "000000000000000000000000", // System ID
              senderName: "System",
              receiverId: customerId,
              message: rule.response,
              isAdmin: true
            }
          });
          // Only send ONE auto-reply per customer message
          break;
        }
      }
    }
  }

  async getChatHistory(userId, isForAdmin = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chatClearedAt: true }
    });

    return prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        // If it's for a customer, only show messages after their cleared timestamp
        ...(!isForAdmin && user?.chatClearedAt ? {
          createdAt: { gt: user.chatClearedAt }
        } : {})
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async clearChatUI(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { chatClearedAt: new Date() }
    });
  }

  async getAllMessagesGrouped() {
    // Get all messages
    const messages = await prisma.chatMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const groups = {};
    const customerIds = new Set();

    messages.forEach((msg) => {
      const customerId = msg.isAdmin ? msg.receiverId : msg.senderId;
      if (customerId) customerIds.add(customerId);
    });

    // Fetch actual user names to avoid "Unknown User"
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(customerIds) } },
      select: { id: true, name: true }
    });
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

    messages.forEach((msg) => {
      const customerId = msg.isAdmin ? msg.receiverId : msg.senderId;
      if (!customerId) return;
      
      if (!groups[customerId]) {
        groups[customerId] = {
          customerId,
          customerName: userMap[customerId] || msg.senderName || "Customer",
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
          isOnline: presenceService.isOnline(customerId),
        };
      }
      if (!msg.isAdmin && !msg.isRead) {
        groups[customerId].unreadCount++;
      }
    });

    return Object.values(groups);
  }

  async markAsRead(customerId) {
    return prisma.chatMessage.updateMany({
      where: {
        senderId: customerId,
        isAdmin: false,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}

module.exports = new ChatService();
