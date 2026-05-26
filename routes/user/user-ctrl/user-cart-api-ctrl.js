const OrderModel = require("../../../models/OrderModel");
const CartModel = require("../../../models/CartModel");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const { getPurchasedCourseIdSet } = require("../../../utils/coursePurchase");

const getCoursesByInstrument = async (instrumentId) => {
  return CourseMasterModel.find(
    { instrument: instrumentId },
    "_id course_title thumbnail_image"
  ).lean();
};

const appendBundledCoursesForInstrument = (
  cart,
  instrumentId,
  courses,
  purchasedSet
) => {
  let modified = false;

  courses.forEach((course) => {
    if (purchasedSet.has(course._id.toString())) return;

    const exists = cart.items.find(
      (i) =>
        i.productType === "course_masters" &&
        i.productId.toString() === course._id.toString()
    );

    if (exists) {
      const needsUpdate =
        exists.price !== 0 ||
        exists.accessReason !== "FREE_WITH_INSTRUMENT" ||
        !exists.linkedInstrumentId ||
        exists.linkedInstrumentId.toString() !== instrumentId.toString();

      if (needsUpdate) {
        exists.price = 0;
        exists.accessReason = "FREE_WITH_INSTRUMENT";
        exists.linkedInstrumentId = instrumentId;
        modified = true;
      }
      return;
    }

    cart.items.push({
      productId: course._id,
      productType: "course_masters",
      title: course.course_title,
      price: 0,
      thumbnail: course.thumbnail_image?.length
        ? [{ ...course.thumbnail_image[0] }]
        : [],
      qty: 1,
      accessReason: "FREE_WITH_INSTRUMENT",
      linkedInstrumentId: instrumentId,
    });
    modified = true;
  });

  return modified;
};

const removeCartItemLines = (cart, productId, productType) => {
  const pid = productId.toString();

  if (productType === "instruments") {
    cart.items = cart.items.filter(
      (item) =>
        !(
          (item.productType === "instruments" &&
            item.productId.toString() === pid) ||
          (item.productType === "course_masters" &&
            item.accessReason === "FREE_WITH_INSTRUMENT" &&
            item.linkedInstrumentId?.toString() === pid)
        )
    );
    return;
  }

  cart.items = cart.items.filter(
    (item) =>
      !(
        item.productId.toString() === pid && item.productType === productType
      )
  );
};

const pruneOrphanBundledCourses = (cart) => {
  const instrumentIds = new Set(
    cart.items
      .filter((i) => i.productType === "instruments")
      .map((i) => i.productId.toString())
  );

  const before = cart.items.length;

  cart.items = cart.items.filter((item) => {
    if (item.productType !== "course_masters") return true;

    if (instrumentIds.size === 0) {
      if (item.accessReason === "FREE_WITH_INSTRUMENT") return false;
      if (Number(item.price) === 0) return false;
      return true;
    }

    const isBundledFree =
      item.accessReason === "FREE_WITH_INSTRUMENT" ||
      (Number(item.price) === 0 && item.linkedInstrumentId);

    if (!isBundledFree) return true;

    const linked = item.linkedInstrumentId?.toString();
    return Boolean(linked && instrumentIds.has(linked));
  });

  return cart.items.length !== before;
};

const saveCartAfterEdit = async (cart) => {
  pruneOrphanBundledCourses(cart);
  if (cart.items.length === 0) {
    await CartModel.deleteOne({ _id: cart._id });
    return { items: [] };
  }
  await cart.save();
  return cart.toObject();
};

/** Drop bundled course lines that no longer have their instrument in the cart. */
const removeStaleCourseLine = (cart, productId) => {
  const instrumentIds = new Set(
    cart.items
      .filter((i) => i.productType === "instruments")
      .map((i) => i.productId.toString())
  );

  const before = cart.items.length;
  cart.items = cart.items.filter((item) => {
    if (item.productType !== "course_masters") return true;
    if (item.productId.toString() !== productId.toString()) return true;

    const linked = item.linkedInstrumentId?.toString();
    const isBundledFree =
      item.accessReason === "FREE_WITH_INSTRUMENT" ||
      Number(item.price) === 0;

    if (!isBundledFree) return true;

    if (instrumentIds.size === 0) return false;

    return Boolean(linked && instrumentIds.has(linked));
  });

  return cart.items.length !== before;
};

const syncBundledCourses = async (cart, userId) => {
  const purchasedSet = await getPurchasedCourseIdSet(userId);

  const instrumentItems = cart.items.filter(
    (i) => i.productType === "instruments"
  );

  for (const item of instrumentItems) {
    const courses = await getCoursesByInstrument(item.productId);
    appendBundledCoursesForInstrument(
      cart,
      item.productId,
      courses,
      purchasedSet
    );
  }

  return saveCartAfterEdit(cart);
};

const AddToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productType } = req.body;

    const purchasedSet = await getPurchasedCourseIdSet(userId);
    const typeMap = {
      instrument: "instruments",
      course: "course_masters",
    };

    const mappedType = typeMap[productType];
    if (!mappedType)
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Invalid product type",
        data: [],
      });

    let product;
    if (mappedType === "instruments") {
      product = await InstrumentModel.findById(productId);
    } else {
      product = await CourseMasterModel.findById(productId);
    }

    if (!product)
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Product not found",
        data: [],
      });

    let thumbnail = [];

    if (mappedType === "instruments" && product.instrument_images?.length > 0) {
      const img = product.instrument_images[0];
      thumbnail = [
        {
          key: img.key,
          url: img.url,
          originalName: img.originalName,
          mimeType: img.mimeType,
          size: img.size,
        },
      ];
    }

    if (
      mappedType === "course_masters" &&
      product.thumbnail_image?.length > 0
    ) {
      const img = product.thumbnail_image[0];
      thumbnail = [
        {
          key: img.key,
          url: img.url,
          originalName: img.originalName,
          mimeType: img.mimeType,
          size: img.size,
        },
      ];
    }

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = new CartModel({ userId, items: [] });
    } else {
      pruneOrphanBundledCourses(cart);
    }

    if (mappedType === "instruments") {
      const instrumentExists = cart.items.find(
        (i) =>
          i.productId.toString() === productId &&
          i.productType === "instruments"
      );

      if (instrumentExists) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Instrument already in cart",
          data: cart,
        });
      }

      // if (!instrumentExists) {
      cart.items.push({
        productId,
        productType: "instruments",
        title: product.instrument_title,
        price: product.instrument_price,
        thumbnail,
        qty: 1,
      });
      // }

      const courses = await getCoursesByInstrument(productId);
      appendBundledCoursesForInstrument(
        cart,
        productId,
        courses,
        purchasedSet
      );
    }

    if (mappedType === "course_masters") {
      if (purchasedSet.has(productId.toString())) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "You have already purchased this course",
          data: cart,
        });
      }

      const alreadyHasInstrument = cart.items.find(
        (i) =>
          i.productType === "instruments" &&
          i.productId.toString() === product.instrument.toString()
      );

      removeStaleCourseLine(cart, productId);
      pruneOrphanBundledCourses(cart);

      const exists = cart.items.find(
        (i) =>
          i.productId.toString() === productId.toString() &&
          i.productType === "course_masters"
      );

      if (exists) {
        const data = await saveCartAfterEdit(cart);
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Course already in cart",
          data,
        });
      }

      cart.items.push({
        productId,
        productType: "course_masters",
        title: product.course_title,
        price: alreadyHasInstrument ? 0 : product.course_price,
        thumbnail,
        qty: 1,
        accessReason: alreadyHasInstrument
          ? "FREE_WITH_INSTRUMENT"
          : "PURCHASED_COURSE",
      });
    }

    const data = await saveCartAfterEdit(cart);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Added to cart",
      data,
    });
  } catch (err) {
    console.log("error", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to add cart",
      data: [],
    });
  }
};

const GetFromCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        error: "",
        success: true,
        msg: "Cart is empty",
        data: {
          items: []
        },
      });
    }

    const data = await syncBundledCourses(cart, userId);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Cart fetched successfully",
      data,
    });
  } catch (err) {
    console.log("GetCart Error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to fetch cart",
      data: [],
    });
  }
};

const IncreaseCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productType } = req.body;

    let cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "No cart exists for this user",
        data: [],
      });
    }

    const item = cart.items.find(
      (i) =>
        i.productId.toString() === productId && i.productType === productType
    );

    if (!item) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Item does not exist in cart",
        data: [],
      });
    }

    item.qty += 1;
    const data = await saveCartAfterEdit(cart);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Item quantity increased",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "Failed to increase quantity",
      data: [],
    });
  }
};

const DecreaseCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productType } = req.body;

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "No cart exists for this user",
        data: [],
      });
    }

    const item = cart.items.find(
      (i) =>
        i.productId.toString() === productId && i.productType === productType
    );

    if (!item) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Item does not exist in cart",
        data: [],
      });
    }

    if (item.qty > 1) {
      item.qty -= 1;
    } else {
      removeCartItemLines(cart, productId, productType);
    }

    const data = await saveCartAfterEdit(cart);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Item quantity decreased",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "Failed to decrease quantity",
      data: [],
    });
  }
};

const RemoveFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productType } = req.body;

    if (!productId || !productType) {
      return res.status(400).json({
        success: false,
        msg: "Product ID and Product Type required",
      });
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        msg: "Cart not found",
      });
    }

    removeCartItemLines(cart, productId, productType);

    const data = await saveCartAfterEdit(cart);

    return res.status(200).json({
      success: true,
      msg: "Item removed successfully",
      data,
    });
  } catch (err) {
    console.error("RemoveFromCart error:", err);
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
};

module.exports = {
  AddToCart,
  GetFromCart,
  IncreaseCartQuantity,
  DecreaseCartQuantity,
  RemoveFromCart,
};
