const { Table } = require("../modules");
const table = new Table();

table.name = "companies";

table.setSchema({
  id: {
    type: "string",
    required: true,
  },
  name: {
    type: "string",
    required: true,
  },
  description: {
    type: "string",
    required: true,
  },
  location: {
    type: "string",
    required: true,
  },
  logo: {
    type: "string",
    required: true,
  },
  score: {
    type: "number",
    default: 0,
  },
});

module.exports = table;
