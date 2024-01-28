const { Client } = require("whatsapp-web.js");
const { Config } = require("../../.obsidian/workers/config");
const path = require("path");
const fs = require("fs");
const config = new Config();
const port = config.get("port");

class MessageEventHandler {
  /**
   *
   * @param {Client} client
   */
  constructor(client) {
    this.client = client;
    this.admins = this.fetchAdmins();
    this.price_list = "";
    this.price_list_file = path.join(__dirname, "pricelist.txt");
    this.orders = this.fetchOrders();
    this.commands = [
      {
        command: "/help",
        description: "Show available commands",
        restricted: false,
        handler: this.handleHelp.bind(this),
      },
      {
        command: "/pricelist",
        description: "Show price list",
        restricted: false,
        handler: this.handlePricelist.bind(this),
      },
      {
        command: "/set_pricelist",
        description: "Set price list",
        restricted: true,
        handler: this.handleSetPricelist.bind(this),
      },
      {
        command: "/order",
        description: "Place an order for a product or service",
        restricted: false,
        handler: this.handleOrder.bind(this),
      },
      {
        command: "/clear_order",
        description: "Clear a completed order",
        restricted: true,
        handler: this.handleCancelOrder.bind(this),
      },
    ];
    this.startMessage =
      "Hi there! Welcome to our WhatsApp service. To get started, type /help to see available commands.";
    this.init();
  }

  init() {
    this.client.on("message", (message) => {
      message.getChat().then((chat) => {
        if (!chat.isGroup) {
          const { body, from } = message;
          let matched = false;
          for (const command of this.commands) {
            if (body.startsWith(command.command)) {
              command.handler(message);
              matched = true;
              return;
            }
          }
          if (!matched) {
            this.sendReply(from, this.startMessage);
          }
        }
      });
    });
  }

  sendReply(to, text) {
    // Use the client to send a reply
    this.client.sendMessage(to, text);
  }

  handleHelp(message) {
    let message_to_send = "";
    for (const command of this.commands) {
      if (!command.restricted) {
        message_to_send += `${command.command} - ${command.description}\n`;
      }
    }
    this.sendReply(message.from, message_to_send);
  }

  handleSetPricelist(message) {
    const { body, from } = message;
    if (this.admins.includes(from.split("@")[0])) {
      //remove the command from the message
      this.price_list = body.replace("/set_pricelist", "");
      this.sendReply(from, "Pricelist set successfully");
    } else {
      this.sendReply(from, "You are not an admin");
    }
  }
  handlePricelist(message) {
    const { body, from } = message;
    if (this.price_list == "") {
      this.sendReply(from, "Pricelist not set");
    }
    this.sendReply(from, this.price_list);
  }

  async handleOrder(message) {
    let { body, from } = message;
    body = body.replace("/order", "");

    try {
      const response = await fetch(
        "http://localhost:" + port + "/api/whatsapp/order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, order: body }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        data.index = this.orders.length + 1;
        this.orders.push(data);
        let index = this.orders.find((order) => order.id === data.id).index;
        const messageText = `Thank you for your order! 🛒\n\nOrder Details: \n${body}\n\n \n${data.message} \n Order ID: ${data.id}`;
        let admin_message =
          "A new order has been placed \n\n Customer Details: \n" +
          from.replace("@c.us", "") +
          "\n\n Order Details: \n" +
          body +
          "\n\n Order ID: " +
          data.id +
          "\n\n Reference ID: " +
          index;
        this.sendMessageToAdmins(admin_message);
        this.sendReply(from, messageText);
      } else {
        this.sendReply(
          from,
          "Error processing your order. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error processing order:", error);
      this.sendReply(
        from,
        "Error processing your order. Please try again later."
      );
    }
  }

  async handleCancelOrder(message) {
    let { body, from } = message;
    body = body.replace("/clear_order", "");

    try {
      const response = await fetch(
        "http://localhost:" + port + "/api/whatsapp/order/clear/" + body,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: body }),
        }
      );

      if (response.ok) {
        // Successfully cleared the order
        const data = await response.json();
        this.sendReply(from, `Order ${body} cleared successfully.`);
      } else {
        // Failed to clear the order
        this.sendReply(
          from,
          "Error clearing the order. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error clearing order:", error);
      this.sendReply(from, "Error clearing the order. Please try again later.");
    }
  }

  async fetchAdmins() {
    try {
      const res = await fetch(
        "http://localhost:" + port + "/api/whatsapp/admins"
      );
      const admins = await res.json();
      this.admins = admins;
    } catch (err) {
      console.log(err);
    }
  }

  async fetchOrders() {
    try {
      const res = await fetch(
        "http://localhost:" + port + "/api/whatsapp/orders?completed=false"
      );
      const orders = await res.json();
      this.orders = orders;
    } catch (err) {
      console.log(err);
    }
  }

  sendMessageToAdmins(message) {
    for (const admin of this.admins) {
      setTimeout(() => {
        this.client.sendMessage(admin + "@c.us", message);
      }, 3000);
    }
  }
}

module.exports = MessageEventHandler;
