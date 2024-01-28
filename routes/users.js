const { Router } = require("../modules");
const router = new Router();
const usersModel = require("../models/users");
const { checkAuth } = require("./resources/functions");

router.basePath = "/users";

router.get("/:id", checkAuth, (req, res) => {
  const { id } = req.params;
  const user = usersModel.findOne({ id });
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: true, message: "User not found" });
  }
});

router.patch("/:id", checkAuth, (req, res) => {
  const id = req.params.id;
  const user = usersModel.findOne({ id });
  if (!user) res.status(404).json({ error: true, message: "User not found" });
  usersModel.update({ id }, req.body);
  res.json({ success: true, message: "User updated successfully" });
});

router.delete("/:id", checkAuth, (req, res) => {
  const id = req.params.id;
  const user = usersModel.findOne({ id });
  if (!user) res.status(404).json({ error: true, message: "User not found" });
  usersModel.delete({ id });
  res.json({ success: true, message: "User deleted successfully" });
});
module.exports = router;
