/**
 * Chat Auto-Reply Rules
 * 
 * To add a new rule:
 * {
 *   keywords: ["keyword1", "keyword2"],
 *   response: "Your automated response message"
 * }
 */

const autoReplyRules = [
  {
    keywords: ["hi", "hello", "hey", "good morning", "good evening", "yo", "hii", "helo"],
    response: "Hello 👋 Thank you for contacting us. One of our team members will reply to you shortly. Please let us know how we can help."
  },
  {
    keywords: ["price", "how much", "cost"],
    response: "Please send the product name or image, and we will provide the price details."
  },
  {
    keywords: ["size", "sizes", "available size"],
    response: "Please send the product name and preferred size. We will check availability for you."
  },
  {
    keywords: ["delivery", "shipping", "when will it arrive", "delivery details"],
    response: "We deliver islandwide. Please send your location or order details so we can provide delivery information."
  },
  {
    keywords: ["manager", "talk to manager", "speak to manager"],
    response: "Your message has been forwarded to our manager. They will reply shortly."
  },
  {
    keywords: ["return policy"],
    response: "Items can be returned or exchanged within 7 days after delivery if they are unused and in original condition."
  },
  {
    keywords: ["refund policy"],
    response: "Orders can only be cancelled and refunded before they are confirmed. Once an order is confirmed, refunds are not available."
  },
  {
    keywords: ["payment methods"],
    response: "We currently accept Cash on Delivery, bank transfer, and online card payments."
  }
];

module.exports = autoReplyRules;
