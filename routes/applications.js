const { Router } = require("../modules");
const router = new Router();
const applicationsModel = require("../models/applications");
const jobsModel = require("../models/jobs");
const ws = require("ws");
let websocket;
let AUTH_STATUS = false;
const {
  checkAuth,
  checkRequiredFields,
  checkAdmin,
  sleep,
} = require("./resources/functions");
const { v4 } = require("uuid");
const usersModel = require("../models/users");
router.basePath = "/applications";

router.get("/", checkAuth, (req, res) => {
  const { id } = req.user;
  let result = applicationsModel.find({ user_id: id });
  if (result) {
    result = result.map((application) => {
      return {
        ...application,
        job: jobsModel.findOne({ id: application.job_id }),
        user: (usersModel.findOne({ id: application.user_id }).password =
          "********"),
      };
    });
    res.json(result);
    return;
  }
  res.json({ error: true, message: "No applications found" });
});

router.get("/all", checkAdmin, (req, res) => {
  let result = applicationsModel.find();
  const { q, limit, page, order } = req.params;

  result.forEach((application) => {
    application.job = jobsModel.findOne({ id: application.job_id });
    if (!application.job) {
      //remove the application if the job is not found
      applicationsModel.delete({ id: application.id });
      application = null;
      return;
    }
    let user = usersModel.findOne({ id: application.user_id });
    application.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    };
  });

  if (result) {
    if (q && q.length > 0 && q != "") {
      const matchs = [];
      result.forEach((application) => {
        if (application.job.title.toLowerCase().includes(q.toLowerCase())) {
          matchs.push(application);
          return;
        }
        if (application.job.company.toLowerCase().includes(q.toLowerCase())) {
          matchs.push(application);
          return;
        }
        if (application.job.location.toLowerCase().includes(q.toLowerCase())) {
          matchs.push(application);
          return;
        }
      });
      result = matchs;
    }
    if (order == "desc") {
      result = result.reverse();
    }

    if (page) {
      result = result.slice((page - 1) * limit, page * limit);
    }
    res.json(result);
    return;
  }
  res.json({ error: true, message: "No applications found" });
});

router.get("/pagenumber", checkAdmin, async (req, res) => {
  const result = applicationsModel.find();
  let pageNum = Math.ceil(result.length / 10);
  res.json(pageNum);
});

router.post("/:id/approve", checkAdmin, async (req, res) => {
  const { id } = req.params;

  if (applicationsModel.find({ id, accepted: true }).length > 0) {
    res
      .status(400)
      .json({ error: true, message: " Application already approved" });
    return;
  }
  const result = applicationsModel.update(
    { id },
    { accepted: true, pending: false }
  );

  if (result) {
    // Connect to the WebSocket
    const websocket = new ws(process.env.WHATSAPP_WEBSOCKET_URL);
    websocket.onopen = () => {
      const payload = { type: "GET_AUTH_STATUS" };
      console.log(payload);
      websocket.send(JSON.stringify(payload));
    };

    websocket.onmessage = async (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "AUTH_STATUS" && payload.payload) {
        // Authorization successful
        const data = applicationsModel.findOne({ id });
        const user = usersModel.findOne({ id: data.user_id });
        const job = jobsModel.findOne({ id: data.job_id });

        if (user.phone) {
          // Replace the country code with ""
          let approvalMessage = `
            🎉 Congratulations! Your application for the position of *_${job.title}_* has been approved. 🎉 \n
            📅 Please visit our office between ${job.date} and ${job.close_date} to proceed with the next steps. \n
            📍 Office Address: ${process.env.OFFICE_ADDRESS} \n
            📞 If you have any questions, feel free to contact us at ${process.env.CONTACT_PHONE}.  
          `;

          approvalMessage = approvalMessage.trim();

          // Send the detailed approval message to the user
          websocket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              to: user.phone,
              text: approvalMessage,
            })
          );
        }
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    res.json({ success: true, message: "Application approved successfully" });
  } else {
    res
      .status(500)
      .json({ error: true, message: "Failed to approve application" });
  }
});

router.post("/:id/reject", checkAdmin, (req, res) => {
  const { id } = req.params;
  const result = applicationsModel.update(
    { id },
    { accepted: false, pending: false }
  );
  if (result) {
    res.json({ success: true, message: "Application rejected successfully" });
  } else {
    res
      .status(500)
      .json({ error: true, message: "Failed to reject application" });
  }
});

router.post(
  "/create",
  checkAuth,
  checkRequiredFields(["job_id"]),
  (req, res) => {
    const { job_id } = req.body;
    const user_id = req.user.id;
    const total_open_applications = applicationsModel.find({
      user_id,
      accepted: false,
    });
    if (applicationsModel.findOne({ job_id, user_id })) {
      return res.status(400).json({
        error: true,
        message: "You have already applied for this job",
      });
    }

    if (total_open_applications.length >= 5) {
      return res.status(400).json({
        error: true,
        premium_error: true,
        message:
          "You have reached the maximum number of open applications. Please upgrade your account.",
      });
    }
    const result = applicationsModel.insert({
      id: v4(),
      job_id,
      user_id,
      created_at: Date.now(),
    });
    if (result) {
      res.json({ success: true, message: "Application created successfully" });
    } else {
      res
        .status(500)
        .json({ error: true, message: "Failed to create application" });
    }
  }
);

module.exports = router;
