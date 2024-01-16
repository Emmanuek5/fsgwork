const { Router } = require("../modules");
const router = new Router();
const jobsModel = require("../models/jobs");
const companyModel = require("../models/companies");
const { v4 } = require("uuid");
const { checkAuth, checkRequiredFields } = require("./resources/functions");
router.basePath = "/job";

router.get("/jobs", (req, res) => {
  const { q, limit, page, order } = req.params;
  let result;
  if (q && q.length > 0 && q != "") {
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
    result = matchs;
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

router.post(
  "/create",
  checkAuth,
  checkRequiredFields([
    "title",
    "description",
    "location",
    "salary",
    "company",
    "date",
    "close_date",
    "type",
    "qualification_required",
  ]),
  (req, res) => {
    const user = req.user;

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
  }
);

router.post(
  "/create/company",
  checkAuth,
  checkRequiredFields(["name", "description", "logo", "location"]),
  (req, res) => {
    const user = req.user;
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
      res
        .status(500)
        .json({ error: true, message: "Failed to create company" });
    }
  }
);

module.exports = router;
