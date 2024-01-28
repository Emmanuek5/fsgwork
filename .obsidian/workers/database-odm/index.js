const axios = require("axios");
const VaultError = require("./errors/VaultError");

let baseURL = process.env.DATABASE_URL;
let connected = false;
let db_token = process.env.DATABASE_TOKEN;

// Function to set the baseURL
function setBaseURL(url) {
  baseURL = url;
}

function setToken(token) {
  db_token = token;
}

// Function to create a new table
async function createNewTable(tableName, schema) {
  try {
    if (connected) {
      const response = await axios.post(`${baseURL}/createTable`, {
        token: db_token,
        tableName: tableName,
        schema: schema,
      });
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function listTables() {
  try {
    if (connected) {
      console.log(`${baseURL}/listTables`);
      const response = await axios.get(`${baseURL}/listTables`, {
        headers: {
          Authorization: `Bearer ${db_token}`,
        },
      });
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to insert a row into a table
async function insertRow(tableName, row) {
  try {
    if (connected) {
      const response = await axios.post(
        `${baseURL}/table/${tableName}/insert`,
        {
          token: db_token,
          row: row,
        }
      );
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to select all rows from a table
async function selectAllRows(tableName) {
  try {
    if (connected) {
      const response = await axios.get(
        `${baseURL}/table/${tableName}/selectAll`,
        {
          headers: {
            Authorization: `Bearer ${db_token}`,
          },
        }
      );
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to find rows based on a query
async function findRows(tableName, query) {
  try {
    if (connected) {
      const response = await axios.post(`${baseURL}/table/${tableName}/find`, {
        token: db_token,
        query: query,
      });
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to update a row in a table
async function updateRow(tableName, query, update) {
  try {
    if (connected) {
      const response = await axios.put(`${baseURL}/table/${tableName}/update`, {
        token: db_token,
        query: query,
        update: update,
      });
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to delete a row from a table
async function deleteRow(tableName, query) {
  try {
    if (connected) {
      const response = await axios.delete(
        `${baseURL}/table/${tableName}/delete`,
        {
          token: db_token,
          data: {
            query: query,
          },
        }
      );
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function deleteAllRows(tableName) {
  try {
    if (connected) {
      const response = await axios.delete(
        `${baseURL}/table/${tableName}/deleteAll`,
        {
          headers: {
            Authorization: `Bearer ${db_token}`,
          },
        }
      );
      return response.data; // Return the response data
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Function to initialize and connect to the database server
function init(url, token) {
  return new Promise(async (resolve, reject) => {
    try {
      setBaseURL(url); // Set the baseURL to the provided URL
      setToken(token); // Set the token to the provided token
      process.env.DATABASE_URL = url;
      process.env.DATABASE_TOKEN = token;
      // Test the connection with a listTables request
      const response = await axios.get(`${baseURL}/listTables`, {
        headers: {
          Authorization: `Bearer ${db_token}`,
        },
      });
      if (response.status === 200) {
        connected = true;
        resolve(true);
        return true;
      } else {
        console.error("Failed to connect to the database server.");
        connected = false;
        reject(false);
      }
    } catch (error) {
      return false;
    }
  });
}

module.exports = {
  init,
  createNewTable,
  insertRow,
  selectAllRows,
  findRows,
  updateRow,
  deleteRow,
  listTables,
  deleteAllRows,
};
