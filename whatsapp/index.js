process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");
const ws = require("ws");
const wss = new ws.Server({ port: 3000 });
const connection_queue = [];
const crypto = require("crypto");
const qrcode = require("qrcode");
const { md5 } = require("../routes/resources/functions");
const MessageEventHandler = require("./events/message_event");
const MessageQueue = [];
let whatsapp = {
  is_ready: false,
  current_qr: "",
  auth: {
    status: false,
    token: "",
  },
};
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./whatsapp/data",
  }),
});

const messageEventHandler = new MessageEventHandler(client);

async function generateQRCode(qrData) {
  try {
    if (!qrData) {
      return;
    }
    const qrImage = await qrcode.toDataURL(qrData);
    return qrImage;
  } catch (error) {
    console.error("Error generating QR code:", error.message);
    return null;
  }
}

wss.on("connection", (ws) => {
  let connectionOptions = {
    isWaitingForQR: false,
    isWaitingAuth: false,
  };

  connection_queue.push({ ws, options: connectionOptions });

  ws.on("message", async (message) => {
    const payload = JSON.parse(message);

    if (payload.type == "GET_READY_STATUS") {
      ws.send(
        JSON.stringify({ type: "READY_STATUS", payload: whatsapp.is_ready })
      );
    }

    if (payload.type === "GET_AUTH_STATUS") {
      ws.send(
        JSON.stringify({ type: "AUTH_STATUS", payload: whatsapp.auth.status })
      );
    }
    if (payload.type === "GET_QR") {
      const qrImage = await generateQRCode(whatsapp.current_qr);
      if (whatsapp.current_qr == "") {
        ws.send(
          JSON.stringify({
            type: "QR",
            payload: null,
            error: "No QR code found",
          })
        );
        connectionOptions.isWaitingAuth = true;
        return;
      }

      ws.send(JSON.stringify({ type: "QR", payload: qrImage }));
      connectionOptions.isWaitingForQR = true;
      connectionOptions.isWaitingAuth = true;
    }

    if (payload.type === "WAIT_FOR_QR") {
      connectionOptions.isWaitingForQR = true;
    }

    if (payload.type === "WAIT_FOR_AUTH") {
      connectionOptions.isWaitingAuth = true;
    }

    if (payload.type === "SEND_MESSAGE") {
      if (whatsapp.auth.status) {
        //remov the first 0 in the phone number
        payload.to = payload.to.replace("0", "234");
        client.sendMessage(payload.to + "@c.us", payload.text.trim());
      } else {
        MessageQueue.push(payload);
        connectionOptions.isWaitingAuth = true;
      }
    }
  });
});

client.on("qr", (qr) => {
  whatsapp.current_qr = qr;
  connection_queue.forEach(async ({ ws, options }) => {
    if (options.isWaitingForQR) {
      let qrImage = await generateQRCode(whatsapp.current_qr);
      ws.send(JSON.stringify({ type: "QR_UPDATED", payload: qrImage }));
      options.isWaitingForQR = false; // Reset waiting status
    }
  });
});

client.on("authenticated", (session) => {
  whatsapp.auth.status = true;
  connection_queue.forEach(async ({ ws, options }) => {
    if (options.isWaitingAuth) {
      whatsapp.auth.status = true;
      ws.send(
        JSON.stringify({ type: "AUTHENTICATED", payload: whatsapp.auth.token })
      );
      options.isWaitingAuth = false; // Reset waiting status
    }
  });
});

client.on("message", async (message) => {
  logMessage(message);
});

client.on("ready", () => {
  console.log("Client is ready!");
  whatsapp.is_ready = true;
  whatsapp.auth.status = true;
  MessageQueue.forEach((message) => {
    console.log(message);
    message.to.replace("0", "234");
    client.sendMessage(message.to + "@c.us", message.text.trim());
  });
  connection_queue.forEach(async ({ ws, options }) => {
    if (options.isWaitingAuth) {
      whatsapp.auth.status = true;
      ws.send(
        JSON.stringify({ type: "AUTHENTICATED", payload: whatsapp.auth.token })
      );
      options.isWaitingAuth = false; // Reset waiting status
    }
  });
});

client.initialize();

function logMessage(message) {
  let logsFolder = path.join(__dirname, "logs");
  if (!fs.existsSync(logsFolder)) {
    fs.mkdirSync(logsFolder, { recursive: true });
  }
  let logFile = path.join(logsFolder, `${message.from.split("@")[0]}.json`);
  if (fs.existsSync(logFile)) {
    let logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
    if (message.hasMedia) {
      logs.push({
        date: new Date().toISOString(),
        message: message.body,
        mime_type: message.mimetype,
      });
    } else {
      logs.push({
        date: new Date().toISOString(),
        message: message.body,
      });
    }
    fs.writeFileSync(logFile, JSON.stringify(logs));
  } else {
    let data = {
      date: new Date().toISOString(),
      message: message.body,
    };
    fs.writeFileSync(logFile, JSON.stringify([data]));
  }
}
