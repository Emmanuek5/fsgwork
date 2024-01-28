const { Table } = require("../modules");
const table = new Table();

table.name = "orders";

table.setSchema({
  id: {
    type: "string",
    required: true,
  },
  from: {
    type: "string",
    required: true,
  },
  order: {
    type: "string",
    required: true,
  },
  completed: {
    type: "boolean",
    default: false,
  },
  created_at: {
    type: "number",
    required: true,
  },
});

module.exports = table;
