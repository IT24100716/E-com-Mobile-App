const chatService = require("./chat.service");
const supabase = require("../../config/supabase");
const path = require("path");

class ChatController {
  async sendMessage(req, res, next) {
    try {
      const { message, receiverId, isAdmin, senderName } = req.body;
      const senderId = req.user.id;
      let imageUrl = null;

      if (req.file) {
        const fileExt = path.extname(req.file.originalname);
        const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
        const filePath = `chat/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          console.error("❌ Supabase Chat Upload Error:", uploadError);
          throw new Error(`Cloud upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const chatMessage = await chatService.sendMessage({
        senderId,
        senderName: senderName || req.user.name || "Unknown User",
        receiverId: receiverId || null,
        message: message || (imageUrl ? "" : " "), // Allow empty message if image exists
        isAdmin: isAdmin === "true" || isAdmin === true || false, // Handle string from FormData
        imageUrl,
      });

      res.status(201).json({
        success: true,
        data: chatMessage,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatHistory(req, res, next) {
    try {
      const isForAdmin = req.user.role?.toLowerCase() === "admin" || req.user.role?.toLowerCase() === "review manager";
      const userId = req.params.userId || req.user.id;
      const history = await chatService.getChatHistory(userId, isForAdmin);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearChatUI(req, res, next) {
    try {
      await chatService.clearChatUI(req.user.id);
      res.status(200).json({
        success: true,
        message: "Chat UI cleared successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllMessagesGrouped(req, res, next) {
    try {
      const groups = await chatService.getAllMessagesGrouped();

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { customerId } = req.params;
      await chatService.markAsRead(customerId);

      res.status(200).json({
        success: true,
        message: "Messages marked as read",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
