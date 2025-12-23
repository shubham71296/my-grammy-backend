const OrderModel = require("../../../models/OrderModel");
const CartModel = require("../../../models/CartModel");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const { randomUUID } = require("crypto");

const getCoursesByInstrument = async (instrumentId) => {
  return CourseMasterModel.find(
    { instrument: instrumentId },
    "_id course_title thumbnail_image"
  ).lean();
};

const AddToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productType } = req.body;

    const purchasedCourseIds = await OrderModel.distinct("items.productId", {
      userId,
      paymentStatus: "paid",
      items: { $elemMatch: { productType: "course_masters" } },
    });

    const purchasedSet = new Set(purchasedCourseIds.map((id) => id.toString()));
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

      courses.forEach((course) => {
        if (purchasedSet.has(course._id.toString())) {
          return;
        }
        const exists = cart.items.find(
          (i) =>
            i.productType === "course_masters" &&
            i.productId.toString() === course._id.toString()
        );

        if (exists) {
          exists.price = 0;
          exists.accessReason = "FREE_WITH_INSTRUMENT";
          exists.linkedInstrumentId = productId;
          return;
        }

        // if (!exists) {
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
          linkedInstrumentId: productId,
        });
        // }
      });
    }

    if (mappedType === "course_masters") {
      const alreadyHasInstrument = cart.items.find(
        (i) =>
          i.productType === "instruments" &&
          i.productId.toString() === product.instrument.toString()
      );

      const exists = cart.items.find(
        (i) =>
          i.productId.toString() === productId &&
          i.productType === "course_masters"
      );

      if (exists) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Course already in cart",
          data: cart,
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

    await cart.save();

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Added to cart",
      data: cart,
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

    const cart = await CartModel.findOne({ userId }).populate({
      path: "items.productId",
      select:
        "instrument_title instrument_price instrument_image course_title course_price course_thumbnail",
    });

    if (!cart) {
      return res.status(200).json({
        error: "",
        success: true,
        msg: "Cart is empty",
        data: [],
      });
    }

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Cart fetched successfully",
      data: cart,
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

    console.log("item", item);
    if (!item) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Item does not exist in cart",
        data: [],
      });
    }

    item.qty += 1;
    await cart.save();

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Item quantity increased",
      data: cart,
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
      cart.items = cart.items.filter(
        (i) =>
          !(
            i.productId.toString() === productId &&
            i.productType === productType
          )
      );
    }

    await cart.save();

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Item quantity decreased",
      data: cart,
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

    if (productType === "instruments") {
      cart.items = cart.items.filter(
        (item) =>
          !(
            (item.productType === "instruments" &&
              item.productId.toString() === productId.toString()) ||
            (item.productType === "course_masters" &&
              item.accessReason === "FREE_WITH_INSTRUMENT" &&
              item.linkedInstrumentId?.toString() === productId.toString())
          )
      );
    } else {
      cart.items = cart.items.filter(
        (item) =>
          !(
            item.productId.toString() === productId.toString() &&
            item.productType === productType
          )
      );
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      msg: "Item removed successfully",
      data: cart,
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
