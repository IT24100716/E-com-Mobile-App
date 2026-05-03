const paymentsService = require("./payments.service");
const { sendSuccess, sendError } = require("../../utils/response");
const supabase = require("../../config/supabase");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
class PaymentsController {
  async create(req, res) { 
    try { 
      const { orderId, amount, method, status } = req.body; 
      let proofImageUrl = null;

      if (method === "bank_deposit" && !req.file) {
        return sendError(res, "Proof image is required for bank deposit", 400);
      }

      if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        try {
            // Try Supabase first
            const { data, error } = await supabase.storage
            .from('payments')
            .upload(`slips/${fileName}`, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
            .from('payments')
            .getPublicUrl(`slips/${fileName}`);

            proofImageUrl = publicUrl;
        } catch (uploadError) {
            console.warn("⚠️ Supabase upload failed, falling back to local storage:", uploadError.message);
            
            // Local fallback
            const uploadDir = path.join(process.cwd(), "uploads", "payments");
            if (!fs.existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }
            
            const localFilePath = path.join(uploadDir, fileName);
            await writeFile(localFilePath, req.file.buffer);
            
            // Return relative path for frontend compatibility
            proofImageUrl = `/uploads/payments/${fileName}`;
        }
      }

      const payment = await paymentsService.create({ 
        orderId, 
        amount: parseFloat(amount), 
        method, 
        proofImageUrl, 
        status 
      }); 

      return sendSuccess(res, "Payment created", payment, 201); 
    } catch (error) { 
      return sendError(res, error.message, 400); 
    } 
  }
  async getAll(req, res) { try { const { skip = 0, take = 10 } = req.query; const payments = await paymentsService.getAll(parseInt(skip), parseInt(take)); const total = await paymentsService.getTotalCount(); return sendSuccess(res, "Payments fetched", { payments, total }); } catch (error) { return sendError(res, error.message, 400); } }
  async getById(req, res) { try { const payment = await paymentsService.getById(req.params.id); if (!payment) return sendError(res, "Payment not found", 404); return sendSuccess(res, "Payment fetched", payment); } catch (error) { return sendError(res, error.message, 400); } }
  async updateStatus(req, res) { try { const payment = await paymentsService.updateStatus(req.params.id, req.body.status); return sendSuccess(res, "Status updated", payment); } catch (error) { return sendError(res, error.message, 400); } }
}
module.exports = new PaymentsController();
