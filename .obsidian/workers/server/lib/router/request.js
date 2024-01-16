const url = require("url");
const querystring = require("querystring");
const fs = require("fs");
const { formidable } = require("formidable");
class Request {
  /**
   * Constructor function for the class.
   *
   * @param {object} httpRequest - The HTTP request object.
   * @return {undefined} This function does not return a value.
   */
  constructor(httpRequest) {
    this.method = httpRequest.method; // GET, POST, PUT, PATCH, DELETE
    this.path = httpRequest.url; // /users
    this.headers = httpRequest.headers; // { 'content-type': 'application/json' }
    this.httpRequest = httpRequest; // The HTTP request object.
    this.body = ""; // The body of the HTTP request.
    this.params = {}; // The parameters of the path.
    this.files = {}; // The files uploaded by the HTTP request.
    this.cookies = {}; // The cookies of the HTTP request.
    this.session = {}; // The session of the HTTP request.
    this.user = null; // The user associated with the session.
    this.file = this.files[0]; // The first file uploaded by the HTTP request.
    this.ip = httpRequest.socket ? httpRequest.socket.remoteAddress : null; // The IP address of the HTTP request.

    this.parseCookies();
  }

  /**
   * Chunk the body of the HTTP request.
   *
   * @param {type} chunk - the chunk of data received from the request
   * @return {void}
   */
  chunkBody() {
    this.httpRequest.on("data", (chunk) => {
      this.body += chunk;
      this.parseBody();
    });
  }

  /**
   * Returns the value of the body property.
   *
   * @return {type} The value of the body property.
   */
  getBody() {
    return this.body;
  }

  /**
   * Parses the body of the request based on the content type.
   *
   * @return {Promise} A promise that resolves when the body has been parsed.
   */
  async parseBody() {
    const contentType = this.headers["content-type"];

    if (contentType && contentType.includes("application/json")) {
      this.body = this.toJSON();
    } else if (
      contentType &&
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      this.parseFormUrlEncoded();
    }
  }

  /**
   * Parses the cookies from the request headers.
   *
   * @return {void}
   */
  parseCookies() {
    const cookieHeader = this.headers && this.headers.cookie;
    if (cookieHeader) {
      this.cookies = querystring.parse(cookieHeader, "; ");
    }
  }
  /**
   * Parses a form encoded string and returns an object containing the decoded key-value pairs.
   *
   * @return {Object} The parsed form data object.
   */
  parseFormUrlEncoded() {
    const formDataPairs = this.body.split("&");
    const formData = {};

    formDataPairs.forEach((pair) => {
      const [key, value] = pair.split("=");
      const decodedKey = decodeURIComponent(
        key.replace(/\[object\s(.*)\]/, "")
      ).trim();
      const decodedValue = decodeURIComponent(value);
      formData[decodedKey] = decodedValue.trim();
    });
    this.body = formData;
    return formData;
  }

  // ...

  /**
   * Parses the form data and populates the body and files properties.
   *
   * @return {Promise} A promise that resolves when the form data is parsed and the properties are populated.
   */
  async parseFormData() {
    const form = formidable({ multiples: true });

    return new Promise((resolve, reject) => {
      form.parse(this.httpRequest, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          this.body = {};
          this.files = {};

          Object.keys(files).forEach((fieldName) => {
            const fieldFiles = files[fieldName];
            const firstFile = fieldFiles[0];

            this.files[fieldName] = {
              name: firstFile.originalFilename,
              temp: firstFile.filepath,
              type: firstFile.mimetype,
              size: firstFile.size,
              mv: (path, callback) => {
                fs.copyFile(firstFile.filepath, path, (err) => {
                  if (err) {
                    callback(err);
                  } else {
                    callback();
                  }
                });
              },
              // Add other properties as needed
            };
          });

          Object.keys(fields).forEach((fieldName) => {
            if (Array.isArray(fields[fieldName])) {
              // If it's an array, use the first item
              this.body[fieldName] = fields[fieldName][0];
            } else {
              // If it's not an array, use it directly
              this.body[fieldName] = fields[fieldName];
            }
          });

          // Use the dynamic field name for files
          const dynamicFieldName = Object.keys(this.files)[0];
          this.file = this.files[dynamicFieldName];

          resolve();
        }
      });
    });
  }

  /**
   * Retrieves the files from the request.
   *
   * @return {Array} Array of files with name, type, and data.
   */
  getFilesFromRequest() {
    const files = [];
    const boundary = this.headers["content-type"].split("=")[1];
    const parts = this.body.split(boundary);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes("filename")) {
        const file = {};
        const fileDetails = parts[i].split("\r\n")[1];
        const fileData = parts[i].split("\r\n")[4];
        const fileName = fileDetails.split("=")[2].replace(/"/g, "");
        const fileType = fileDetails.split("=")[3].replace(/"/g, "");
        file.name = fileName;
        file.type = fileType;
        file.data = fileData;
        files.push(file);
      }
    }
    return files;
  }

  /**
   * Converts the body of the current object to a JSON object.
   *
   * @return {Object} The parsed JSON object.
   */
  toJSON() {
    try {
      return JSON.parse(this.body);
    } catch (error) {}
  }
}

module.exports = {
  Request,
};
