const { Table } = require("../modules");
const table = new Table();

table.name = "applications";

table.setSchema({
  id: {
    type: "string",
    required: true,
  },
  job_id: {
    type: "string",
    required: true,
  },
  user_id: {
    type: "string",
    required: true,
  },
  pending: {
    type: "boolean",
    default: true,
  },
  accepted: {
    type: "boolean",
    default: false,
  },
  created_at: {
    type: "number",
    required: true,
  },
});

module.exports = table;
