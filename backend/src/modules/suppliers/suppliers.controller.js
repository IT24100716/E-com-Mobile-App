const suppliersService = require("./suppliers.service");
const { sendSuccess, sendError } = require("../../utils/response");
const supabase = require("../../config/supabase");
const path = require("path");

class SuppliersController {
  async create(req, res) {
    try {
      let imageUrl = null;

      if (req.file) {
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${Date.now()}${fileExt}`;
        const filePath = `suppliers/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const supplierData = {
        ...req.body,
        imageUrl: imageUrl
      };

      const supplier = await suppliersService.create(supplierData, req.user);
      return sendSuccess(res, "Supplier created", supplier, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;
      const suppliers = await suppliersService.getAll(parseInt(skip), parseInt(take));
      const total = await suppliersService.getTotalCount();
      return sendSuccess(res, "Suppliers fetched", { suppliers, total });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const supplier = await suppliersService.getById(req.params.id);
      if (!supplier) {
        return sendError(res, "Supplier not found", 404);
      }
      return sendSuccess(res, "Supplier fetched", supplier);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${Date.now()}${fileExt}`;
        const filePath = `suppliers/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const supplierData = {
        ...req.body,
        imageUrl: imageUrl
      };

      const supplier = await suppliersService.update(req.params.id, supplierData, req.user);
      return sendSuccess(res, "Supplier updated", supplier);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await suppliersService.delete(req.params.id, req.user);
      return sendSuccess(res, "Supplier deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new SuppliersController();
