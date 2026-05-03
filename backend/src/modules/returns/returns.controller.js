const returnsService = require("./returns.service");
const { sendSuccess, sendError } = require("../../utils/response");
const supabase = require("../../config/supabase");
const path = require("path");

class ReturnsController {
  async create(req, res) { 
    try { 
      let imageUrl = null;

      // Handle image upload to Supabase if present
      if (req.file) {
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
        const filePath = `returns/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          console.error("❌ Supabase Upload Error (Returns):", uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }
      const returnReq = await returnsService.createByUser(
        req.user.id, 
        req.body.orderId, 
        req.body.reason, 
        req.body.items,
        imageUrl
      ); 
      return sendSuccess(res, "Return request created", returnReq, 201); 
    } catch (error) { 
      const statusCode = error.message.includes("Unauthorized") ? 403 : 400; 
      return sendError(res, error.message, statusCode); 
    } 
  }
  async getAll(req, res) { try { const { skip = 0, take = 10 } = req.query; const returns = await returnsService.getAll(parseInt(skip), parseInt(take)); const total = await returnsService.getTotalCount(); return sendSuccess(res, "Returns fetched", { returns, total }); } catch (error) { return sendError(res, error.message, 400); } }
  async getById(req, res) { try { const returnReq = await returnsService.getById(req.params.id); if (!returnReq) return sendError(res, "Return not found", 404); return sendSuccess(res, "Return fetched", returnReq); } catch (error) { return sendError(res, error.message, 400); } }
  async updateStatus(req, res) { try { const returnReq = await returnsService.updateStatus(req.params.id, req.body.status); return sendSuccess(res, "Status updated", returnReq); } catch (error) { return sendError(res, error.message, 400); } }
  async cancelByUser(req, res) { try { await returnsService.deleteByUser(req.params.id, req.user.id); return sendSuccess(res, "Return cancelled"); } catch (error) { const statusCode = error.message.includes("Unauthorized") ? 403 : 400; return sendError(res, error.message, statusCode); } }
  async delete(req, res) { try { await returnsService.delete(req.params.id); return sendSuccess(res, "Return deleted"); } catch (error) { return sendError(res, error.message, 400); } }
}
module.exports = new ReturnsController();
