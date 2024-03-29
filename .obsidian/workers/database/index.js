const fs = require("fs");
const mysql = require("mysql");
const mongoose = require("mongoose");
const path = require("path");
const EventEmitter = require("events"); // Import the EventEmitter module
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { log } = require("console");
const ObsidianError = require("../../classes/ObsidianError");
class Database {
  constructor(
    options = {
      name: "database",
      port: 3000,
      web_enabled: true,
      token: "",
      use_external_db: false,
      url: "127.0.0.1",
    }
  ) {
    this.dbName = options.name;
    this.webEnabled = options.web_enabled;
    this.token = options.token;
    process.env.DATABASE_TOKEN = options.token;
    this.tables = {};
    if (!fs.existsSync(path.join(__dirname + "/data"))) {
      fs.mkdirSync(path.join(__dirname + "/data"));
    }
    this.load();

    this.app = express();
    this.port = options.port || 6379;
    this.remote = options.use_external_db;

    this.app.use(bodyParser.urlencoded({ extended: true }));
    // Add middleware to parse JSON requests
    this.app.use(bodyParser.json());

    // Define HTTP routes for database operations
    this.app.post("/createTable", this.checkToken, (req, res) =>
      this.createTableRoute(req, res)
    );
    this.app.get("/listTables", this.checkToken, (req, res) =>
      this.listTablesRoute(req, res)
    );
    this.app.get("/getTable/:tableName", this.checkToken, (req, res) =>
      this.getTableRoute(req, res)
    );
    // Define routes for table operations
    this.app.post("/table/:tableName/insert", this.checkToken, (req, res) =>
      this.insertRowRoute(req, res)
    );
    this.app.get("/table/:tableName/selectAll", this.checkToken, (req, res) =>
      this.selectAllRoute(req, res)
    );
    this.app.post("/table/:tableName/find", this.checkToken, (req, res) =>
      this.findRoute(req, res)
    );
    this.app.put("/table/:tableName/update", this.checkToken, (req, res) =>
      this.updateRowRoute(req, res)
    );
    this.app.delete("/table/:tableName/delete", this.checkToken, (req, res) =>
      this.deleteRowRoute(req, res)
    );
    this.app.delete(
      "/table/:tableName/deleteAll",
      this.checkToken,
      (req, res) => this.deleteAllRoute(req, res)
    );
    this.app.put(
      "/table/:tableName/findOneAndUpdate",
      this.checkToken,
      (req, res) => this.updateOneRowRoute(req, res)
    );
    this.app.delete(
      "/table/:tableName/findAndDeleteOne",
      this.checkToken,
      (req, res) => {
        this.deleteOneRowRoute(req, res);
      }
    );

    this.app.post("/receiveData", this.checkToken, (req, res) =>
      this.receiveDataRoute(req, res)
    );

    if (options.remote) {
      this.connectToRemoteServer(
        options.url.split(":")[0],
        options.url.split(":")[1]
      );
    }
    if (options.web_enabled) {
      this.app.listen(this.port, () => {
        console.log(`Database server listening on port ${this.port}`);
      });
    }

    setInterval(() => {
      this.save();
    }, 5000);
  }

  async checkToken(req, res, next) {
    let { token } = req.body;
    const headers = req.headers;
    //check token from header or body
    if (!token) {
      const headerToken = headers["authorization"];
      if (!headerToken || !headerToken.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      token = headerToken.split(" ")[1];
    }

    // Continue with token verification logic...
    if (token === process.env.DATABASE_TOKEN) {
      next();
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  async receiveDataRoute(req, res) {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Data is required." });
    }

    // Insert data into the database
    this.insertData(data);

    return res.json({ message: "Data received successfully." });
  }

  async insertData(data) {
    try {
      const jsonData = JSON.parse(data);

      // Iterate over each table in the received data
      for (const tableName in jsonData.tables) {
        // Get the corresponding table object
        const table = this.getTable(tableName);

        // If the table exists, update its data with the received data
        if (table) {
          const tableData = jsonData.tables[tableName].data;

          // Merge the existing data in the table with the received data
          for (const rowData of tableData) {
            table.insert(rowData);
          }
        }
      }

      this.emit("save");
    } catch (error) {
      console.error("Error parsing and updating data:", error);
    }
  }

  async connectToRemoteServer(name, token) {
    if (name.startsWith("http://") || name.startsWith("https://")) {
      try {
        // Make a GET request to the remote server to retrieve table data
        const response = await axios.get(`${name}/listTables`);
        const { tables } = response.data;

        // Create tables based on the remote server's response
        for (const tableName of tables) {
          if (!this.tables[tableName]) {
            this.tables[tableName] = new Table();
            // Fetch and insert data from the remote server for each table
            const tableResponse = await axios.get(
              `${name}/getTable/${tableName}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            this.tables[tableName].insertData(tableResponse.data);
          }
        }

        console.log(`Connected to remote server at ${name}`);
        this.remote = true;
        return true;
      } catch (error) {
        console.error("Error connecting to remote server:", error.message);
      }
    } else {
      return false;
    }
  }

  insertRowRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const { row } = req.body;
    if (!row) {
      return res.status(400).json({ error: "Row data is required." });
    }

    if (table.insert(row)) {
      return res.json({ message: "Row inserted successfully." });
    } else {
      return res.status(400).json({ error: "Row insertion failed." });
    }
  }

  selectAllRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const allRows = table.selectAll();
    return res.json(allRows);
  }

  findRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query data is required." });
    }

    const results = table.find(query);
    return res.json(results);
  }

  updateRowRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const { query, update } = req.body;
    if (!query || !update) {
      return res
        .status(400)
        .json({ error: "Both query and update data are required." });
    }

    if (table.findAndUpdate(query, update)) {
      return res.json({ message: "Row updated successfully." });
    } else {
      return res.status(404).json({ error: "Row not found for update." });
    }
  }

  updateOneRowRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const { query, update } = req.body;
    if (!query || !update) {
      return res
        .status(400)
        .json({ error: "Both query and update data are required." });
    }

    if (table.findOneAndUpdate(query, update)) {
      return res.json({ message: "Row updated successfully." });
    } else {
      return res.status(404).json({ error: "Row not found for update." });
    }
  }

  deleteRowRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query data is required." });
    }

    if (table.findAndDelete(query)) {
      return res.json({ message: "Row deleted successfully." });
    } else {
      return res.status(404).json({ error: "Row not found for deletion." });
    }
  }

  deleteOneRowRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query data is required." });
    }

    if (table.findAndDeleteOne(query)) {
      return res.json({ message: "Row deleted successfully." });
    } else {
      return res.status(404).json({ error: "Row not found for deletion." });
    }
  }

  deleteAllRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    table.deleteAll();
    return res.json({ message: "All rows deleted successfully." });
  }

  createTableRoute(req, res) {
    const { tableName, schema } = req.body;
    if (!tableName) {
      return res.status(400).json({ error: "Table name is required." });
    }
    if (!schema) {
      return res.status(400).json({ error: "Table schema is required." });
    }

    if (!this.createTable(tableName, schema)) {
      console.log(`Table '${tableName}' already exists.`);
      return res
        .status(400)
        .json({ error: `Table '${tableName}' already exists.` });
    }
    return res.json({ message: `Table '${tableName}' created successfully.` });
  }

  listTablesRoute(req, res) {
    const tables = this.listTables();

    return res.json({ tables });
  }

  getTableRoute(req, res) {
    const { tableName } = req.params;
    const table = this.getTable(tableName);
    if (!table) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    return res.json(table);
  }

  createTable(tableName, schema) {
    if (this.tables[tableName] === undefined) {
      this.tables[tableName] = new Table();
      this.tables[tableName].name = tableName;
      this.tables[tableName].setSchema(schema);
      //check for the save event and save the database
      this.tables[tableName].on("save", () => {
        console.log("Table saved");
        this.save();
      });
      this.save();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get a table by name
   * @param {string} tableName
   * @returns {Table}
   * */
  getTable(tableName) {
    return this.tables[tableName];
  }

  listTables() {
    return Object.keys(this.tables);
  }

  // Function to send data to the remote server
  async sendDataToRemoteServer(data) {
    try {
      // Replace 'http://example.com' with the actual remote server URL
      const remoteServerUrl = this.dbName;
      await axios.post(`${remoteServerUrl}/receiveData`, { data });
      console.log("Data sent to remote server successfully");
    } catch (error) {
      console.error("Error sending data to remote server:", error.message);
    }
  }

  async toMongoDB(mongoDBUrl) {
    try {
      // Open a connection to the MongoDB server using Mongoose
      await mongoose.connect(mongoDBUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      const mongoDBData = this.toMongoDBFormat();

      for (const tableName in mongoDBData) {
        const Model = mongoose.model(tableName, new mongoose.Schema({}));

        // Insert data into the MongoDB collection
        await Model.insertMany(mongoDBData[tableName]);
      }

      console.log("Data sent to MongoDB server successfully");
    } catch (error) {
      console.error("Error sending data to MongoDB server:", error);
    } finally {
      // Close the Mongoose connection
      mongoose.connection.close();
    }
  }

  toSQL(host, username, password, database) {
    0;
    const connection = mysql.createConnection({
      host: host,
      user: username,
      password: password,
      database: database,
    });

    connection.connect((err) => {
      if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
      }

      console.log("Connected to MySQL");

      for (const tableName in this.tables) {
        const tableData = this.tables[tableName].data;

        // Create the table
        let createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (id INT PRIMARY KEY AUTO_INCREMENT, `;

        // Assume the first row has keys for column names
        const columnNames = Object.keys(tableData[0]);

        for (const columnName of columnNames) {
          createTableQuery += `${columnName} VARCHAR(255), `;
        }

        createTableQuery = createTableQuery.slice(0, -2); // Remove the last comma and space
        createTableQuery += ");";

        connection.query(createTableQuery, (err, result) => {
          if (err) {
            console.error("Error creating table:", err);
          } else {
            console.log(`Table ${tableName} created`);
          }
        });

        // Insert data into the table
        for (const row of tableData) {
          let insertQuery = `INSERT INTO ${tableName} (`;
          insertQuery += columnNames.join(", ") + ") VALUES (";
          insertQuery +=
            columnNames.map((col) => `'${row[col]}'`).join(", ") + ");";

          connection.query(insertQuery, (err, result) => {
            if (err) {
              console.error("Error inserting data:", err);
            } else {
              console.log(`Data inserted into ${tableName}`);
            }
          });
        }
      }

      connection.end((err) => {
        if (err) {
          console.error("Error closing connection:", err);
        } else {
          console.log("Connection closed");
        }
      });
    });
  }

  save() {
    try {
      const data = {
        tables: {},
      };

      // Populate data object with table information
      for (const tableName in this.tables) {
        data.tables[tableName] = this.tables[tableName].toJSON();
      }

      // Construct the file path
      const filePath = path.join(__dirname, "data", `${this.dbName}.json`);
      const backupFilePath = path.join(
        __dirname,
        "data/backups",
        `${this.dbName}-${Date.now()}.json.bak`
      ); // Use timestamp for a unique backup file

      //delete old backup files
      const backupFiles = fs.readdirSync(path.join(__dirname, "data/backups"));
      for (const file of backupFiles) {
        fs.unlinkSync(path.join(__dirname, "data/backups", file));
      }

      // Convert data to JSON format
      const jsonContent = JSON.stringify(data, null, 4);

      // Write JSON content to the file
      fs.writeFileSync(filePath, jsonContent);

      // Write JSON content to the backup file
      fs.writeFileSync(backupFilePath, jsonContent);

      // If 'remote' is enabled, send data to the remote server
      if (this.remote) {
        this.sendDataToRemoteServer(jsonContent);
      }
    } catch (error) {
      console.error("Error saving database:", error.message);
    }
  }

  load() {
    const filePath = path.join(__dirname, "data", `${this.dbName}.json`);

    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ tables: {} }, null, 4));
      }

      const data = fs.readFileSync(filePath, "utf8");
      const jsonContent = JSON.parse(data);

      for (const tableName in jsonContent.tables) {
        if (!this.tables[tableName]) {
          this.tables[tableName] = new Table();
        }
        this.tables[tableName].insertData(jsonContent.tables[tableName].data);
        this.tables[tableName].name = tableName;

        // Set up the 'save' event for each table
        this.tables[tableName].on("save", () => {
          console.log(`Table '${tableName}' saved`);
          this.save();
        });
      }

      console.log(`Database '${this.dbName}' loaded successfully`);

      // If 'remote' is enabled, connect to the remote server
      if (this.remote) {
        this.connectToRemoteServer(this.dbName);
      }
    } catch (error) {
      console.error("Error loading database:", error.message);
    }
  }

  add(module) {
    if (typeof module === "object" && module instanceof Table) {
      if (module.name !== "") {
        if (!this.tables[module.name]) {
          this.tables[module.name] = module;
          module.on("save", () => {
            this.save();
          });
          return true;
        } else {
          // Table already exists, merge data with the existing table
          module.insertData(this.tables[module.name].data);
          module.on("save", () => {
            this.save();
          });
          return true;
        }
      } else {
        console.error("The Table name is not defined.");
        return false;
      }
    } else {
      console.error("The table module must be an instance of Table.");
      return false;
    }
  }
}

class Table extends EventEmitter {
  constructor() {
    super();
    this.data = [];
    this.name = "";
    this.schema = {}; // Store the table schema as an object
  }

  addId() {
    let idAdded = false;
    let id = 1;

    for (const row of this.data) {
      // Check if _id already exists
      if (row._id === undefined) {
        // If not, set it to the current id
        row._id = id;
        idAdded = true;
      }

      // Check if id already exists
      if (row.id === undefined) {
        // If not, set it to the current id
        row.id = row._id;
        idAdded = true;
      } else {
        // If id already exists, make sure _id is the same
        row._id = row.id;
      }

      id++;
    }

    return idAdded;
  }
  // Set the table schema with unique constraints
  setSchema(schema) {
    this.schema = schema;
  }

  /**
   * Inserts a row into the table.
   *
   * @param {Object} row - The row to be inserted.
   * @return {boolean} Returns true if the row was successfully inserted, false otherwise.
   */
  insert(row) {
    // Validate that the inserted row matches the schema
    const schemaKeys = Object.keys(this.schema);
    const rowKeys = Object.keys(row);

    rowKeys.forEach((key) => {
      if (!schemaKeys.includes(key)) {
        console.error(`Column '${key}' does not exist in the table schema.`);
        return false;
      }
    });
    //crosscheck schema and row keys let itc heck if the key has a default value
    schemaKeys.forEach((key) => {
      if (
        this.schema[key].required &&
        !rowKeys.includes(key) &&
        row[key] === undefined &&
        this.schema[key].default === undefined
      ) {
        console.error(
          `Column '${key}' is required but not provided in the inserted row.`
        );
        return false;
      }
    });
    for (const key in this.schema) {
      // Check if the key is required and not provided (unless it has a default)
      if (
        this.schema[key].required &&
        !rowKeys.includes(key) &&
        this.schema[key].default === undefined
      ) {
        console.error(
          `Column '${key}' is required but not provided in the inserted row.`
        );
        return false;
      }

      // Check if the default value is defined in the schema
      if (this.schema[key].default !== undefined && row[key] === undefined) {
        row[key] = this.schema[key].default;
      }

      // Check if the type is defined in the schema
      if (this.schema[key].type) {
        const expectedType = this.schema[key].type;
        const actualType = typeof row[key];

        // Check if the actual type matches the expected type
        if (actualType !== expectedType) {
          console.error(
            `Column '${key}' must be of type '${expectedType}', but got '${actualType}'.`
          );
          const array = [
            false,
            `Column '${key}' must be of type '${expectedType}', but got '${actualType}'.`,
          ];
          return array;
        }
      }

      if (this.schema[key].unique) {
        // Check uniqueness for columns marked as unique
        const isUnique = !this.data.some(
          (existingRow) => existingRow[key] === row[key]
        );

        if (!isUnique) {
          console.error(
            `Column '${key}' must be unique, but a duplicate value exists.`
          );
          return false;
        }
      }
    }

    this.data.push(row);
    this.addId();
    this.emit("save");
    return row;
    // Emit the 'save' event after inserting a row
  }

  insertOne(row) {
    return this.insert(row);
  }
  insertData(data) {
    this.data = data;
    this.emit("save");
  }

  selectAll() {
    const data = Object.values(this.data);
    return data;
    return this.data;
  }

  toJSON() {
    return {
      data: this.data,
    };
  }

  /**
   * Finds and returns a list of rows from the data that match the given query.
   *
   * @param {Object} query - The query to match the rows against.
   * @return {Table} - An array of rows that match the query.
   */
  find(query) {
    if (
      query === undefined ||
      query === null ||
      Object.keys(query).length === 0 ||
      query == {}
    ) {
      const detached_data = [];
      for (const row of this.data) {
        detached_data.push({ ...row });
      }
      return [...detached_data]; // Return a shallow copy of the data array
    }
    const results = [];
    for (const row of this.data) {
      let match = true;
      for (const key in query) {
        if (row[key] !== query[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        results.push({ ...row }); // Create a new object for each row
      }
    }
    results.reverse(); // Reverse the results array to preserve the original order
    return results; // Return the results array with new objects
  }

  /**
   * Find and return the first result that matches the given query.
   *
   * @param {} query - The query object used to filter the results.
   * @return {Object|null} The first result that matches the query, or null if no match is found.
   */
  findOne(query) {
    const results = this.find(query);
    if (results.length > 0) {
      return results[0];
    } else {
      return null;
    }
  }

  findByOr(query) {
    if (
      query === undefined ||
      query === null ||
      Object.keys(query).length === 0 ||
      query == {}
    ) {
      return this.data;
    }

    const results = [];
    for (const row of this.data) {
      let match = false;
      for (const key in query) {
        if (row[key] === query[key]) {
          match = true;
          break;
        }
      }
      if (match) {
        results.push(row);
      }
    }
    return results;
  }

  save() {
    this.emit("save");
    return true;
  }
  /**
   * Find and update a row in the database based on the given query and update.
   *
   * @param {object} query - The query object used to find the row.
   * @param {object} update - The update object used to update the row.
   * @return {boolean} Returns true if a row was found and updated, false otherwise.
   */
  findAndUpdate(query, update) {
    const results = this.find(query);

    if (results.length > 0) {
      //locate the data in the main array and update it
      for (let data of this.data) {
        if (data.id === results[0].id) {
          for (const key in update) {
            data[key] = update[key];
          }
        }
      }
      this.emit("save");
      return true;
    } else {
      return false;
    }
  }

  /**
   * Updates a row in the database based on the given query and update object.
   *
   * @param {object} query - The query object used to find the row to update.
   * @param {object} update - The object containing the updated values for the row.
   * @return {boolean} Returns true if a row was found and updated, false otherwise.
   */
  findOneAndUpdate(query, update) {
    const results = this.find(query);
    if (results.length > 0) {
      //locate the data in the main array and update it
      for (let data of this.data) {
        if (data.id === results[0].id) {
          for (const key in update) {
            if (this.schema[key]) {
              data[key] = update[key];
            } else {
              throw new ObsidianError(
                "Column does not exist in the schema: " + key
              );
            }
          }
        }
      }
      this.emit("save");
      return true;
    } else {
      return false;
    }
    // Emit the 'save' event after updating a row
  }

  /**
   * Delete the first element in the data array that matches the given query.
   *
   * @param {type} query - the query to match against the elements in the data array
   * @return {boolean} true if an element is deleted, otherwise false
   */
  findAndDelete(query) {
    const results = this.find(query);
    if (results.length > 0) {
      for (const row of results) {
        this.data.splice(this.data.indexOf(row), 1);
      }
      return true;
    } else {
      return false;
    }
    // Emit the 'save' event after deleting a row
  }

  findOneAndDelete(query) {
    const results = this.find(query);

    if (results.length > 0) {
      const row = results[0];
      this.data.splice(this.data.indexOf(row), 1);
      return true;
    } else {
      return false;
    }
    // Emit the 'save' event after deleting a row
  }

  /**
   * Deletes rows from the data array that match the given query.
   *
   * @param {Object} query - The query object used to filter the rows.
   * @return {boolean} Returns true if any rows were deleted, false otherwise.
   */
  delete(query) {
    const results = this.find(query);
    if (results.length > 0) {
      for (const row of results) {
        this.data.splice(this.data.indexOf(row), 1);
      }
      return true;
    } else {
      return false;
    }
    // Emit the 'save' event after deleting a row
  }

  /**
   * Updates the data in the main array based on the given query and update object.
   *
   * @param {Object} query - The query object used to filter the data.
   * @param {Object} update - The update object containing the new values to update the data.
   * @throws {Error} Invalid type for key. Expected string.
   * @throws {Error} Value value is not unique for key.
   * @return {boolean} Returns true if the data was successfully updated, otherwise false.
   */
  update(query, update) {
    const results = this.find(query);
    if (results.length > 0) {
      // locate the data in the main array and update it
      // check the keys and validate them with the schema
      for (let data of this.data) {
        if (data.id === results[0].id) {
          for (const key in update) {
            if (this.schema[key]) {
              data[key] = update[key];
            } else {
              throw new ObsidianError(
                "Column does not exist in the schema: " + key
              );
            }
          }
        }
      }

      this.emit("save");
      return true;
    } else {
      return false;
    }
  }

  /**
   * Delete all the elements in the data array that match the given query.
   *
   * @param {type} query - the query to match against the elements in the data array
   * @return {boolean} true if an element is deleted, otherwise false
   */
  deleteAll() {
    this.data = [];
    this.emit("save");
    this.save();
  }
}

module.exports = {
  Database,
  Table,
};
