const ordersModel = require("../models/orders");
const { Router } = require("../modules");
const { checkRequiredFields, md5 } = require("./resources/functions");

const router = new Router();

router.basePath = "/whatsapp";

router.get("/admins", (req, res) => {
  res.json(["2348142159080"]);
});

router.post("/order", checkRequiredFields(["from", "order"]), (req, res) => {
  const { from, order } = req.body;
  let id = md5(from + order + Date.now());
  const result = ordersModel.insert({
    id,
    from,
    order,
    created_at: Date.now(),
  });

  if (result) {
    res.json({
      success: true,
      message:
        "Order created successfully, please wait for confirmation from our staff",
      id,
      orders: ordersModel.find(),
    });
  } else {
    res.status(500).json({ error: true, message: "Failed to create order" });
  }
});

router.patch("/order/clear/:id", (req, res) => {
  const { id } = req.params;
  const result = ordersModel.update({ id }, { cleared: true });
  if (result) {
    res.json({ success: true, message: "Order cleared successfully" });
  } else {
    res.status(500).json({ error: true, message: "Failed to clear order" });
  }
});

router.get("/order/:id", (req, res) => {
  const { id } = req.params;
  const result = ordersModel.findOne({ id });
  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ error: true, message: "Order not found" });
  }
});

router.get("/orders", (req, res) => {
  const { completed } = req.params;
  const result = ordersModel.find({ completed: completed === "true" });
  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ error: true, message: "Orders not found" });
  }
});

router.delete("/order/:id", (req, res) => {
  const { id } = req.params;
  const result = ordersModel.findOneAndDelete({ id });
  if (result) {
    res.json({ success: true, message: "Order deleted successfully" });
  } else {
    res.status(404).json({ error: true, message: "Order not found" });
  }
});

module.exports = router;
