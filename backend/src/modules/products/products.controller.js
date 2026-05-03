const productsService = require("./products.service");
const { sendSuccess, sendError } = require("../../utils/response");
const supabase = require("../../config/supabase");
const path = require("path");
const crypto = require("crypto");

class ProductsController {
  async create(req, res) {
    try {
      let imageUrl = null;
      let images = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileExt = path.extname(file.originalname);
          // Add random string to avoid collisions for rapid sequential uploads
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
          const filePath = `products/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
            });

          if (uploadError) {
            console.error("❌ Supabase Upload Error:", uploadError);
            if (uploadError.message === "Invalid Compact JWS") {
              throw new Error("Supabase API Key is invalid. Please ensure you copied the 'service_role' key (the long one starting with 'eyJ') correctly into your .env file.");
            }
            if (uploadError.message === "new row violates row-level security policy") {
              throw new Error("Supabase permissions error. Please ensure you are using the 'service_role' key and that the 'product-images' bucket is public.");
            }
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

          images.push(publicUrl);
        }
      }

      if (req.body.existingImages) {
        try {
          const existing = JSON.parse(req.body.existingImages);
          if (Array.isArray(existing)) {
            images = [...existing, ...images];
          }
        } catch (e) {
          console.warn("Could not parse existingImages JSON:", e);
        }
      }

      if (images.length > 0) {
        imageUrl = images[0];
      }

      req.body.images = images;
      if (req.body.variants && typeof req.body.variants === "string") {
        try {
          req.body.variants = JSON.parse(req.body.variants);
        } catch (e) {
          console.warn("Could not parse variants JSON:", e);
        }
      }

      // Inject unique IDs for every variant if they don't have one
      if (Array.isArray(req.body.variants)) {
        req.body.variants = req.body.variants.map(v => ({
          ...v,
          id: v.id || crypto.randomUUID()
        }));
      }

      if (req.body.isActive !== undefined) {
        req.body.isActive = req.body.isActive === "true" || req.body.isActive === true;
      }

      const product = await productsService.create(req.body, imageUrl, req.user);
      return sendSuccess(res, "Product created", product, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const { skip = 0, take = 10, categoryId } = req.query;
      const products = await productsService.getAll(parseInt(skip), parseInt(take), categoryId);
      const total = await productsService.getTotalCount(categoryId);
      return sendSuccess(res, "Products fetched", { products, total });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const product = await productsService.getById(req.params.id);
      if (!product || product.isDeleted) {
        return sendError(res, "Product not found", 404);
      }
      return sendSuccess(res, "Product fetched", product);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      let imageUrl = null;
      let images = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileExt = path.extname(file.originalname);
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
          const filePath = `products/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
            });

          if (uploadError) {
            console.error("❌ Supabase Upload Error:", uploadError);
            if (uploadError.message === "Invalid Compact JWS") {
              throw new Error("Supabase API Key is invalid. Please ensure you copied the 'service_role' key (the long one starting with 'eyJ') correctly into your .env file.");
            }
            if (uploadError.message === "new row violates row-level security policy") {
              throw new Error("Supabase permissions error. Please ensure you are using the 'service_role' key and that the 'product-images' bucket is public.");
            }
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

          images.push(publicUrl);
        }
      }

      if (req.body.existingImages) {
        try {
          const existing = JSON.parse(req.body.existingImages);
          if (Array.isArray(existing)) {
            images = [...existing, ...images];
          }
        } catch (e) {
          console.warn("Could not parse existingImages JSON:", e);
        }
      }

      if (images.length > 0) {
        imageUrl = images[0];
      }

      req.body.images = images;
      if (req.body.variants && typeof req.body.variants === "string") {
        try {
          req.body.variants = JSON.parse(req.body.variants);
        } catch (e) {
          console.warn("Could not parse variants JSON:", e);
        }
      }

      if (Array.isArray(req.body.variants)) {
        req.body.variants = req.body.variants.map(v => ({
          ...v,
          id: v.id || crypto.randomUUID()
        }));
      }

      if (req.body.isActive !== undefined) {
        req.body.isActive = req.body.isActive === "true" || req.body.isActive === true;
      }

      const product = await productsService.update(req.params.id, req.body, imageUrl, req.user);
      return sendSuccess(res, "Product updated", product);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await productsService.delete(req.params.id, req.user);
      return sendSuccess(res, "Product deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getLowStock(req, res) {
    try {
      const { threshold = 5 } = req.query;
      const products = await productsService.getLowStockProducts(parseInt(threshold));
      return sendSuccess(res, "Low stock products fetched", products);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new ProductsController();
