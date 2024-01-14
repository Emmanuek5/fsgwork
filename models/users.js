const { Table } = require("../modules");
const table = new Table();
table.name = "users";

table.setSchema({
  id: {
    type: "string",
    required: true,
  },
  name: {
    type: "string",
    required: true,
  },
  username: {
    type: "string",
    required: true,
  },
  age: {
    type: "number",
    default: 0,
  },
  occupation: {
    type: "string",
    default: "No occupation",
  },
  onboarding_completed: {
    type: "boolean",
    default: false,
  },
  working_years: {
    type: "number",
    default: 0,
  },
  experience: {
    type: "object",
    default: [],
  },
  gender: {
    type: "string",
    default: "No gender",
  },
  profile_image: {
    type: "string",
    required: true,
  },
  saves: {
    type: "object",
    required: false,
  },
  applications: {
    type: "object",
    required: false,
  },
  password: {
    type: "string",
    required: true,
  },
  bio: {
    type: "string",
    default: "No bio",
  },
  location: {
    type: "string",
    default: "No location",
  },
  university: {
    type: "string",
    default: "No university",
  },
  qualification: {
    type: "string",
    default: "No major",
  },
  skills: {
    type: "string",
    default: "No skills",
  },
  cv: {
    type: "string",
    default: "No cv",
  },
  email: {
    type: "string",
    required: true,
  },
  phone: {
    type: "string",
    default: "No phone",
  },
  address: {
    type: "string",
    default: "No phone",
  },
  created_at: {
    type: "number",
    required: true,
  },
  v_key: {
    type: "string",
    required: true,
  },
  is_verified: {
    type: "boolean",
    required: true,
  },
  is_premium: {
    type: "boolean",
    required: true,
  },
  is_admin: {
    type: "boolean",
    required: true,
  },
});

module.exports = table;
