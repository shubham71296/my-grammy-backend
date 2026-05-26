const OrderModel = require("../../../models/OrderModel");
const { listDocuments } = require("../../../utils/listDocuments");

const ORDER_QUERY_FIELDS = [
  "amount",
  "paymentStatus",
  "items.title",
  "createdAt",
  "updatedAt",
];

const GetMyOrders = (req, res) =>
  listDocuments({
    Model: OrderModel,
    req,
    res,
    allowedQueryFields: ORDER_QUERY_FIELDS,
    enforceQuery: { userId: req.user.id },
  });

module.exports = {
  GetMyOrders,
};
