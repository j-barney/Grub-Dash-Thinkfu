const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

function priceIsValid(req, res, next) {
  const { data: { price } = {} } = req.body;
  if (price && Number.isInteger(price) && price > 0) {
    return next();
  }
  next({
    status: 400,
    message: "Dish must have a price that is an integer greater than 0",
  });
}

function list(req, res) {
  const { dishId } = req.params;
  res.json({
    data: dishes.filter(
      dishId ? (order) => order.dishId === dishId : () => true
    ),
  });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function dishExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish not found: ${req.params.dishId}`,
  });
}

function update(req, res, next) {
  const dish = res.locals.dish;
  const dishId = req.params.dishId;
  const { data: { id, name, description, price, image_url } = {} } = req.body;
  if (id === dishId || !id || id === undefined || id === null) {
    dish.name = name;
    dish.description = description;
    dish.price = price;
    dish.image_url = image_url;
    res.json({ data: dish })
}
  next({
    status: 400,
    message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`
  })
}

// TODO: Implement the /dishes handlers needed to make the tests pass
module.exports = {
  create: [
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("image_url"),
    priceIsValid,
    create,
  ],
  update: [
    dishExists,
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("image_url"),
    priceIsValid,
    update,
  ],
  read: [dishExists, read],
  list,
  dishExists,
};
