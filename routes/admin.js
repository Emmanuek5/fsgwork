const { Router } = require("../modules");
const router = new Router();
const usersModel = require("../models/users");
const jobsModel = require("../models/jobs");
router.basePath = "/admin";

router.get("/users", (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.json(usersModel.find());
  } else {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
});

router.get("/jobs", (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.json(jobsModel.find());
  } else {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
});

router.post("/job/edit", (req, res) => {
  const user = req.user;
  if (!user || !user.isAdmin) {
    res.status(401).json({ error: true, message: "Unauthorized" });
    return;
  }
  const { id, title, description, location, salary } = req.body;
  if (!id || !title || !description || !location) {
    res.status(400).json({ error: true, message: "Missing fields" });
    return;
  }
  const result = jobsModel.findOneAndUpdate(
    { id },
    { title, description, location, salary }
  );
  if (result) {
    res.json({ success: true, message: "Job updated successfully" });
  } else {
    res.status(500).json({ error: true, message: "Failed to update job" });
  }
});

module.exports = router;
