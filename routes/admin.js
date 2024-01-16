const { Router } = require("../modules");
const router = new Router();
const usersModel = require("../models/users");
const jobsModel = require("../models/jobs");
const qualification = require("./resources/qualification.json");
const skills = require("./resources/skills.json");
const { checkAdmin } = require("./resources/functions");
router.basePath = "/admin";

router.get("/users", checkAdmin, (req, res) => {
  const { q, limit, page, order } = req.params;

  let result = usersModel.find();
  result.forEach((user) => {
    if (user.password) {
      user.password = "********";
    }
  });

  if (q) {
    const matchs = [];
    result.forEach((user) => {
      if (user.name.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(user);
        return;
      }
      if (user.username.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(user);
        return;
      }
      if (user.email.toLowerCase().includes(q.toLowerCase())) {
        matchs.push(user);
        return;
      }
    });
    result = matchs;
  }

  let pageNum = limit ? Math.ceil(result.length / limit) : 1;
  if (page) {
    result = result.slice((page - 1) * limit, page * limit);
  }

  if (order == "desc") {
    result = result.reverse();
  }

  res.json({ result });
});

router.patch("/user/:id", checkAdmin, (req, res) => {
  const { id } = req.params;
  //lets get the fields and values and update
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);
  let upadate = {};
  for (let i = 0; i < fields.length; i++) {
    if (fields[i] == "password") {
      upadate[fields[i]] = values[i];
    } else {
      upadate[fields[i]] = values[i];
    }
  }
  if (fields.includes("email")) {
    const user = usersModel.findOne({ email: upadate.email });
    if (user && user.id != id) {
      res.status(400).json({ error: true, message: "Email already exists" });
      return;
    }
  }

  if (fields.includes("username")) {
    const user = usersModel.findOne({ username: upadate.username });
    if (user && user.id != id) {
      res.status(400).json({ error: true, message: "Username already exists" });
      return;
    }
  }
  const result = usersModel.findAndUpdate({ id }, upadate);

  if (result) {
    res.json({ success: true, message: "User updated successfully" });
  } else {
    res.status(500).json({ error: true, message: "Failed to update user" });
  }
});

router.get("/users/pagenumber", checkAdmin, (req, res) => {
  const { limit } = req.params;
  const result = usersModel.find({});
  let pageNum = limit ? Math.ceil(result.length / limit) : 1;
  res.json(pageNum);
});

router.get("/user/:id", checkAdmin, (req, res) => {
  const { id } = req.params;
  const result = usersModel.findOne({ id });
  result.qualification = qualification.find(
    (qualification) => qualification.value === result.qualification
  );
  if (result.qualification) {
    result.qualification = result.qualification.name;
  }

  result.skills = skills.find((skill) => skill.value === result.skills);

  if (result.skills) {
    result.skills = result.skills.name;
  }
  if (result) {
    let user = {
      ...result,
      password: "********",
    };
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: true, message: "User not found" });
  }
});

router.get("/jobs", checkAdmin, (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.json(jobsModel.find());
  } else {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
});

router.post("/job/edit", checkAdmin, (req, res) => {
  const user = req.user;

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
