const { Router } = require("../modules");
const router = new Router();
const usersModel = require("../models/users");
const Mailer = require("./classes/mailer");
const { v4 } = require("uuid");
const { checkRequiredFields } = require("./resources/functions");

const mailerConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "rccgheritageofgod@gmail.com",
    pass: "xhos winu bnmf rjcv",
  },
};

const mailer = new Mailer(mailerConfig);

const mailOptions = {
  from: "no-reply@knight-smp.com",
  to: "recipient@example.com",
  subject: "Test Email",
  text: "This is a test email sent using nodemailer.",
};

router.basePath = "/auth";

router.post(
  "/login",
  checkRequiredFields(["email", "password"]),
  (req, res) => {
    const { email, password } = req.body;
    const result = usersModel.findOne({ email });
    if (result) {
      if (result.password === password) {
        if (result.is_verified) {
          req.session.user = {
            id: result.id,
            username: result.username,
            profile_image: result.profile_image,
            email: result.email,
            isAdmin: result.is_admin,
            level: result.is_admin ? 1 : 0,
            is_premium: result.is_premium,
          };
          res.json({ success: true, message: "Login successful" });
        } else {
          const key = result.v_key;
          mailOptions.subject = "Verify your email address";
          mailOptions.to = email;
          mailOptions.text = `http://localhost:8000/verify/${key}`;
          mailOptions.html = `
    <h1>Thank you for signing up for FSG Work Solutions</h1>
    <p>Please click the link below to verify your email address</p>
    <a href="http://localhost:8000/verify/${key}">Verify Email</a>
    <p>http://localhost:8000/verify/${key}</p>
    <p>If you did not sign up for FSG Work Solutions, please ignore this email.</p>
    `;
          mailer.sendMail(mailOptions);
          res.status(400).json({
            error: true,
            message:
              "Please verify your email, check your inbox for the verification link sent to your email",
          });
        }
      } else {
        res.status(400).json({ error: true, message: "Invalid password" });
      }
    } else {
      res.status(404).json({ error: true, message: "User not found" });
    }
  }
);

router.get("/verify/:key", (req, res) => {
  const { key } = req.params;
  const result = usersModel.findOne({ v_key: key, is_verified: false });
  if (result) {
    usersModel.findOneAndUpdate({ v_key: key }, { is_verified: true });
    req.session.user = {
      id: result.id,
      username: result.username,
      profile_image: result.profile_image,
      email: result.email,
      isAdmin: result.is_admin,
      is_premium: result.is_premium,
    };
    res.json({ success: true, message: "Email verified successfully" });
  } else {
    res.status(400).json({ error: true, message: "Invalid verification link" });
  }
});

router.get("/check/:username", (req, res) => {
  const { username } = req.params;
  const result = usersModel.find({ username });
  if (result.length > 0) {
    res.json({ error: true, message: "Username already exists" });
  } else {
    res.json({ success: true, message: "Username available" });
  }
});

router.post(
  "/register",
  checkRequiredFields(["email", "password"]),
  async (req, res) => {
    const {
      name,
      username,
      password,
      email,
      c_password,
      age,
      gender,
      state,
      country,
    } = req.body;
    const file = req.file;
    const data = usersModel.find({ email });
    const username_check = usersModel.find({ username });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    //lets require a password with at least 6 characters that has at least one uppercase letter, one lowercase letter, one number, and one special character
    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

    if (data.length > 0) {
      res.status(400).json({
        error: true,
        message: "A user with that email already exists",
      });
      return;
    }

    if (username_check.length > 0) {
      res.status(400).json({
        error: true,
        message: "A user with that username already exists",
      });
      return;
    }
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: true, message: "Invalid email address" });
      return;
    }

    if (!passwordRegex.test(password)) {
      res.status(400).json({
        error: true,
        message:
          "The password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
      return;
    }

    if (password === c_password) {
      let filename = Math.random() + file.name;
      const image = `./assets/images/${filename}`;
      await file.mv(image, (err) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ error: true, message: "Failed to upload image" });
          return;
        }
      });
      const key = v4();
      mailOptions.subject = "Verify your email address";
      mailOptions.to = email;
      mailOptions.text = `http://localhost:8000/verify/${key}`;
      mailOptions.html = `
    <h1>Thank you for signing up for FSG Work Solutions</h1>
    <p>Please click the link below to verify your email address</p>
    <a href="http://localhost:8000/verify/${key}">Verify Email</a>
    <p>http://localhost:8000/verify/${key}</p>
    <p>If you did not sign up for FSG Work Solutions, please ignore this email.</p>
    `;
      let age_n = parseInt(age);
      const result = usersModel.insert({
        id: v4(),
        username,
        name,
        age_n,
        gender,
        location: state + ", " + country,
        password,
        profile_image: image,
        email,
        v_key: key,
        created_at: Date.now(),
        is_verified: false,
        is_admin: false,
        is_premium: false,
      });
      if (result) {
        mailer
          .sendMail(mailOptions)
          .then(() => {
            console.log("Email sent");
          })
          .catch((error) => {
            console.log(error);
          });
        req.session.user = {
          id: result.id,
          username: result.username,
          profile_image: result.profile_image,
          email: result.email,
          isAdmin: result.is_admin,
          is_premium: result.is_premium,
        };
        res
          .status(200)
          .json({ success: true, message: "Registration successful" });
        return;
      } else {
        res.status(500).json({ error: true, message: "Failed to register" });
        return;
      }
    } else {
      res.status(400).json({ error: true, message: "Passwords do not match" });
      return;
    }
  }
);

module.exports = router;
