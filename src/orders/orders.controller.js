const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

function dataExists(req, res, next) {
  const data = req.body.data;
  if (data) {
    next();
  } else {
    next({
      status: 400,
      message: "Request must include data",
    });
  }
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    if (req.body.data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order not found: ${orderId}`,
  });
}

function dishesValidator(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!Array.isArray(dishes) || !dishes.length) {
    next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  next();
}

function dishQuantityValidator(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  dishes.map((dish, index) => {
    if (
      !dish.quantity ||
      dish.quantity < 1 ||
      !Number.isInteger(dish.quantity)
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  });
  return next();
}

function statusValidator(req, res, next) {
  const order = res.locals.order;
  const { data: { status } = {} } = req.body;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (!validStatus.includes(status) || !status) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
  return next();
}

function deliverCheck(req, res, next) {
  const order = res.locals.order;
  const { data: { status } = {} } = req.body;
  if (status == "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  return next();
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function list(req, res) {
  const filteredOrders = orders.filter(
    (order) => !req.params.dishId || order.dishId == req.params.dishId
  );
  res.json({ data: filteredOrders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res, next) {
  const { orderId } = req.params;
  const order = res.locals.order;
  const { data: { id, deliverTo, mobileNumber, dishes } = {} } = req.body;
  if (id === orderId || !id || id === undefined || id === null) {
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.dishes = dishes;
    res.json({ data: order });
  }
  next({
    status: 400,
    message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
  });
}

function destroy(req, res, next) {
  const { orderId } = req.params;
  const order = res.locals.order;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1 && order.status == "pending") {
    orders.splice(index, 1);
    res.sendStatus(204);
  }
  next({
    status: 400,
    message: "An order cannot be deleted unless it is pending",
  });
}

module.exports = {
  list,
  create: [
    dataExists,
    dishesValidator,
    dishQuantityValidator,
    bodyDataHas("mobileNumber"),
    bodyDataHas("deliverTo"),
    bodyDataHas("dishes"),
    create,
  ],
  update: [
    dataExists,
    orderExists,
    dishesValidator,
    dishQuantityValidator,
    statusValidator,
    deliverCheck,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    update,
  ],
  read: [orderExists, read],
  delete: [orderExists, destroy],
  orderExists,
};
