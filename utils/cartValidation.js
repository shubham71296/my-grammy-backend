const InstrumentModel = require("../models/InstrumentModel");
const CourseMasterModel = require("../models/CourseMasterModel");

const thumbnailFromInstrument = (product) => {
  const img = product.instrument_images?.[0];
  if (!img) return [];
  return [
    {
      key: img.key,
      url: img.url,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
    },
  ];
};

const thumbnailFromCourse = (product) => {
  const img = product.thumbnail_image?.[0];
  if (!img) return [];
  return [
    {
      key: img.key,
      url: img.url,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
    },
  ];
};

/**
 * Rebuild cart lines from catalog prices (prevents tampered cart totals at checkout).
 */
async function buildValidatedCartItems(cart) {
  if (!cart?.items?.length) {
    return { items: [], totalAmount: 0, changed: false };
  }

  const validated = [];
  let changed = false;

  const hasInstrumentInCart = (instrumentId) =>
    cart.items.some(
      (i) =>
        i.productType === "instruments" &&
        i.productId.toString() === instrumentId.toString()
    );

  for (const line of cart.items) {
    if (line.productType === "instruments") {
      const product = await InstrumentModel.findById(line.productId)
        .select("instrument_title instrument_price instrument_images")
        .lean();
      if (!product) continue;

      const price = Number(product.instrument_price) || 0;
      const snapshot = {
        productId: line.productId,
        productType: "instruments",
        title: product.instrument_title,
        price,
        thumbnail: thumbnailFromInstrument(product),
        qty: Math.max(1, line.qty || 1),
        accessReason: line.accessReason || "",
        linkedInstrumentId: line.linkedInstrumentId || null,
      };
      if (price !== line.price || snapshot.title !== line.title) changed = true;
      validated.push(snapshot);
      continue;
    }

    if (line.productType === "course_masters") {
      const product = await CourseMasterModel.findById(line.productId)
        .select("course_title course_price thumbnail_image instrument")
        .lean();
      if (!product) continue;

      const freeWithInstrument =
        line.accessReason === "FREE_WITH_INSTRUMENT" ||
        hasInstrumentInCart(product.instrument);
      const price = freeWithInstrument ? 0 : Number(product.course_price) || 0;

      const snapshot = {
        productId: line.productId,
        productType: "course_masters",
        title: product.course_title,
        price,
        thumbnail: thumbnailFromCourse(product),
        qty: Math.max(1, line.qty || 1),
        accessReason: freeWithInstrument ? "FREE_WITH_INSTRUMENT" : line.accessReason || "",
        linkedInstrumentId: line.linkedInstrumentId || null,
      };
      if (price !== line.price || snapshot.title !== line.title) changed = true;
      validated.push(snapshot);
    }
  }

  const totalAmount = validated.reduce((sum, i) => sum + i.price * i.qty, 0);
  if (validated.length !== cart.items.length) changed = true;

  return { items: validated, totalAmount, changed };
}

function cartSnapshotChanged(orderItems, validatedItems, totalAmount, orderAmount) {
  if (!orderItems?.length && !validatedItems?.length) return false;
  if (orderItems.length !== validatedItems.length) return true;
  if (Math.abs((orderAmount || 0) - totalAmount) > 0.01) return true;

  const key = (i) => `${i.productType}:${i.productId.toString()}:${i.qty}:${i.price}`;
  const orderKeys = orderItems.map(key).sort().join("|");
  const cartKeys = validatedItems.map(key).sort().join("|");
  return orderKeys !== cartKeys;
}

module.exports = { buildValidatedCartItems, cartSnapshotChanged };
