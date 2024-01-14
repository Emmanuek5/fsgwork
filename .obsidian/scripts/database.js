const args = process.argv.slice(2);
const { Database } = require("../workers/database");
const config = require("../../obsidian.config.json");

let args_type = ["p", "n"];
let options = config.database;

if (args_type.includes(args[0])) {
  console.log("Database server running on port " + options.port);
  options.port = args[1];
}

if (args_type.includes(args[2])) {
  options.name = args[3];
}

const database = new Database(options);
