const { Router } = require("../modules");
const router = new Router();
const jobsModel = require("../models/jobs");
const companyModel = require("../models/companies");
const { v4 } = require("uuid");
router.basePath = "/job";

router.get("/jobs", (req, res) => {
  const { q, limit, page, order } = req.params;
  let result;
  if (q) {
    result = jobsModel.find({});
    //Lets make it so that it can check if any of the results match the query or have any of the words in the query in it
    const matchs = [];
    result.forEach((job) => {
      if (job.title.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(job);
        return;
      }
      if (job.company.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(job);
        return;
      }
      if (job.location.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(job);
        return;
      }
    });
  } else {
    result = jobsModel.find({});
  }
  if (limit) {
    result = result.slice(0, limit);
  }

  let pageNum = limit ? Math.ceil(result.length / limit) : 1;
  if (page) {
    result = result.slice((page - 1) * limit, page * limit);
  }

  if (order == "asc") {
    result;
  } else if (order == "desc") {
    result = result.reverse();
  }

  res.json(result);
});
router.get("/pagenumber", async (req, res) => {
  const { limit } = req.params;
  const result = jobsModel.find({});
  let pageNum = limit ? Math.ceil(result.length / limit) : 1;
  res.json(pageNum);
});
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const result = jobsModel.findOne({ id });
  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ error: "Job not found" });
  }
});

router.post("/create", (req, res) => {
  const user = req.user;
  if (!user || !user.isAdmin) {
    res.status(401).json({ error: true, message: "Unauthorized" });
    return;
  }
  const {
    title,
    description,
    location,
    salary,
    company,
    date,
    close_date,
    type,
    qualification_required,
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !salary ||
    !company ||
    !date ||
    !close_date ||
    !type ||
    !qualification_required
  ) {
    let missing_fields = [];

    // Check each field and push the missing ones into the array
    if (!title) missing_fields.push("title");
    if (!description) missing_fields.push("description");
    if (!location) missing_fields.push("location");
    if (!salary) missing_fields.push("salary");
    if (!company) missing_fields.push("company");
    if (!date) missing_fields.push("date");
    if (!close_date) missing_fields.push("close_date");
    if (!type) missing_fields.push("type");
    if (!qualification_required) missing_fields.push("qualifaction_required");

    res.status(400).json({
      error: true,
      message: "All fields are required :" + missing_fields.join(", "),
    });
    return;
  }

  const result = jobsModel.insert({
    id: v4(),
    title,
    description,
    location,
    salary,
    company,
    date,
    close_date,
    type,
    qualification_required,
    created_at: Date.now(),
  });
  if (result) {
    res.json({ success: true, message: "Job created successfully" });
  } else {
    res.status(500).json({ error: true, message: "Failed to create job" });
  }
});

router.post("/create/company", (req, res) => {
  const user = req.user;
  if (!user || !user.isAdmin) {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
  const { name, description, logo, location } = req.body;

  const result = companyModel.insert({
    name,
    description,
    logo,
    location,
  });

  if (result) {
    res.json({ success: true, message: "Company add successfully" });
  } else {
    res.status(500).json({ error: true, message: "Failed to create company" });
  }
});

module.exports = router;
