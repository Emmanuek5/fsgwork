const { Router } = require("../modules");
const router = new Router();
const usersModel = require("../models/users");
const qualification = require("./resources/qualification.json");
const skills = require("./resources/skills.json");
const { v4 } = require("uuid");
const { checkRequiredFields, checkAuth } = require("./resources/functions");

router.basePath = "/onboarding";

router.get("/qualifications", (req, res) => {
  res.json(qualification);
});

router.get("/skills", (req, res) => {
  res.json(skills);
});

router.post(
  "/experiences",
  checkRequiredFields(["years", "experiences", "university"]),
  checkAuth,
  (req, res) => {
    const user = req.user;
    const { years, experiences, university } = req.body;

    const result = usersModel.findAndUpdate(
      { id: user.id },
      { working_years: years, experience: experiences, university }
    );
    if (result) {
      res.json({ success: true, message: "Experiences added successfully" });
    } else {
      res
        .status(500)
        .json({ error: true, message: "Failed to add experiences" });
    }
  }
);

router.post(
  "/information",
  checkRequiredFields(["phone", "address"]),
  checkAuth,
  (req, res) => {
    const user = req.user;

    const { phone, address } = req.body;
    if (!phone || !address) {
      res.status(400).json({ error: true, message: "Missing fields" });
    }
    const result = usersModel.findAndUpdate(
      { id: user.id },
      { phone, address }
    );
    if (result) {
      res.json({ success: true, message: "Information added successfully" });
    } else {
      res
        .status(500)
        .json({ error: true, message: "Failed to add information" });
    }
  }
);
router.post(
  "/profile",
  checkAuth,
  checkRequiredFields(["bio", "qualification", "skills", "occupation"]),
  (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: "Unauthorized" });
      return;
    }
    const { bio, qualification, skills, occupation } = req.body;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: true, message: "Missing file" });
      return;
    }
    const filePATH = `./assets/files/${file.name}-${v4()}.${
      file.type.split("/")[1]
    }`;
    file.mv(filePATH, async (err) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: true, message: "Failed to upload file" });
        return;
      }
      const result = usersModel.findAndUpdate(
        { id: user.id },
        {
          occupation: occupation,
          bio,
          qualification,
          skills,
          cv: filePATH,
        }
      );
      res.json({ success: true, message: "Profile updated successfully" });
    });
  }
);

module.exports = router;
