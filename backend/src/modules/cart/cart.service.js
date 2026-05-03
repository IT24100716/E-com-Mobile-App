const prisma = require("../../config/prisma");
const { isVariantMatch } = require("../../utils/variantMatcher");
class CartService {
  async getCart(userId) {
    const cart = await prisma.cart.findUnique({ 
      where: { userId }, 
      include: { 
        items: { 
          include: { 
            product: true 
          } 
        } 
      } 
    });

    if (!cart) return { items: [], total: 0 };

    // Supplement items with maxStock calculated on the fly
    const itemsWithStock = await Promise.all(cart.items.map(async (item) => {
      const maxStock = this.#getAvailableStock(item.product, item.variantAttributes);
      return { ...item, maxStock };
    }));

    return { ...cart, items: itemsWithStock };
  }

  async addItem(userId, productId, quantity, variantAttributes = null) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");

    const availableStock = this.#getAvailableStock(product, variantAttributes);

    // Check if item with same productId and exact same variantAttributes exists
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
        variantAttributes: variantAttributes ? { equals: variantAttributes } : { equals: null }
      }
    });

    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (newQuantity > availableStock) {
      throw new Error(`Insufficient stock. Only ${availableStock} items available.`);
    }

    if (existingItem) {
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true }
      });
    } else {
      return prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          variantAttributes
        },
        include: { product: true }
      });
    }
  }

  async updateItem(cartItemId, quantity) {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true }
    });

    if (!item) throw new Error("Item not found");

    const availableStock = this.#getAvailableStock(item.product, item.variantAttributes);

    if (quantity > availableStock) {
      throw new Error(`Insufficient stock. Only ${availableStock} items available.`);
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true }
    });
  }

  async removeItem(cartItemId) { 
    return prisma.cartItem.deleteMany({ 
      where: { id: cartItemId } 
    }); 
  }
  async clearCart(userId) { return prisma.cartItem.deleteMany({ where: { cart: { userId } } }); }

  // Helper to calculate available stock from product/variant
  #getAvailableStock(product, variantAttributes) {
    if (!product) return 0;
    
    // If no variants, just use product stock
    if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      return product.stock || 0;
    }

    const matchingVariant = product.variants.find(v => {
      if (variantAttributes?.id) return v.id === variantAttributes.id;
      return isVariantMatch(v.attributes, variantAttributes);
    });

    return matchingVariant ? (matchingVariant.stock || 0) : 0;
  }
}
module.exports = new CartService();
