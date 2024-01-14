const nodemailer = require("nodemailer");

class Mailer {
  constructor(config) {
    this.transporter = nodemailer.createTransport(config);
  }

  sendMail(options) {
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  }
}

module.exports = Mailer;
