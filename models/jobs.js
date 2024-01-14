const { Table } = require("../modules");
const table = new Table();

table.name = "jobs";

table.setSchema({
  id: {
    type: "string",
    required: true,
  },
  title: {
    type: "string",
    required: true,
  },
  qualification_required: {
    type: "string",
    required: true,
  },
  type: {
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
  salary: {
    type: "string",
    required: true,
  },
  company: {
    type: "string",
    required: true,
  },
  date: {
    type: "string",
    required: true,
  },
  close_date: {
    type: "string",
    required: true,
  },
  created_at: {
    type: "number",
    required: true,
  },
});

module.exports = table;
