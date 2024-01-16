const fs = require("fs");
const path = require("path");
const { RenderEngines } = require("../utils/Engines");
const zlib = require("zlib");
// lib/response.js
class Response {
  constructor(httpResponse) {
    this.response = httpResponse;
    this.req_headers = {};
    this.statusCode = 200; // Default status code is 200 OK
    this.limi;
    this.headers = {
      "Content-Type": "text/html",
      Engine: "Obsidian Engine",
      Engine_Version: require("../../../../../package.json").version,
      Engine_Author: require("../../../../../package.json").author,
      Engine_License: require("../../../../../package.json").license,
      Engine_Repo: require("../../../../../package.json").repository.url,
    };
    this.mainPath = process.cwd() + "/pages";
    this.rendered = false;
    this.renderedFile = "";
    this.viewEngine = "html";
    this.body = "";
  }
  /**
   * Compresses the response body using gzip encoding if the client accepts it.
   *
   * @return {Buffer|string} The compressed response body.
   */
  async compress() {
    const acceptEncoding = this.req_headers["accept-encoding"];

    if (!acceptEncoding || !acceptEncoding.includes("gzip")) {
      return this.body;
    }

    this.setHeader("Content-Encoding", "gzip");
    this.body = zlib.gzipSync(this.body);
    return this.body;
  }

  /**
   * Sets the status code for the current instance.
   *
   * @param {number} statusCode - The status code to set.
   * @return {Object} - The current instance.
   */
  setStatus(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  /**
   * Sets a cookie with the specified name, value, and options.
   *
   * @param {string} name - The name of the cookie.
   * @param {string} value - The value of the cookie.
   * @param {Object} options - The options for the cookie.
   * @param {Date} options.expires - The expiration date of the cookie.
   * @param {number} options.maxAge - The maximum age of the cookie in seconds.
   * @param {string} options.domain - The domain of the cookie.
   * @param {string} options.path - The path of the cookie.
   * @param {boolean} options.secure - Indicates if the cookie should only be
   *   sent over HTTPS.
   * @param {boolean} options.httpOnly - Indicates if the cookie should only be
   *   accessible via HTTP and not through client-side scripting.
   */
  setCookie(name, value, options = {}) {
    const cookie = `${name}=${value}`;

    if (options.expires) {
      cookie += `; Expires=${options.expires.toUTCString()}`;
    }

    if (options.maxAge) {
      cookie += `; Max-Age=${options.maxAge}`;
    }

    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }

    if (options.path) {
      cookie += `; Path=${options.path}`;
    }

    if (options.secure) {
      cookie += "; Secure";
    }

    if (options.httpOnly) {
      cookie += "; HttpOnly";
    }

    this.headers["Set-Cookie"] = this.headers["Set-Cookie"]
      ? `${this.headers["Set-Cookie"]}; ${cookie}`
      : cookie;
  }

  /**
   * Sets the status code of the response.
   *
   * @param {number} statusCode - The status code to set.
   * @return {Object} - Returns the current instance of the object.
   */
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  /**
   * Sets the response headers, body, and sends the response as a JSON object.
   *
   * @param {Object} body - The JSON object to be sent in the response body.
   * @return {Object} - Returns the current instance of the class for method chaining.
   */
  json(body) {
    this.setHeader("Content-Type", "application/json");
    this.body = JSON.stringify(body);
    this.response.writeHead(this.statusCode, this.headers);
    this.response.end(this.body);
    return this;
  }
  /**
   * Sets the header value for a given header.
   *
   * @param {string} header - The name of the header.
   * @param {any} value - The value to set for the header.
   * @return {Object} - The updated object with the new header value.
   */
  setHeader(header, value) {
    this.headers[header] = value;
    return this;
  }

  /**
   * Sends the specified body as the response.
   *
   * @param {any} body - The body to send as the response.
   * @return {object} Returns the current object.
   */
  send(body) {
    try {
      this.body = body;
      this.response.writeHead(this.statusCode, this.headers);
      this.response.end(this.body);
      return this;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Redirects the user to the specified URL.
   *
   * @param {string} url - The URL to redirect the user to.
   * @return {object} - Returns the current object for method chaining.
   */
  redirect(url) {
    this.response.writeHead(302, { Location: url });
    this.response.end();
    return this;
  }

  /**
   * Reads a file from the specified file path and sends it as a response.
   *
   * @param {string} filePath - The path of the file to be read.
   * @return {object} - The current object for method chaining.
   */
  file(filePath) {
    if (fs.existsSync(filePath)) {
      this.body = fs.readFileSync(filePath);
      this.compress();
      this.setHeader("Content-Type", "application/octet-stream");
      this.response.writeHead(this.statusCode, this.headers);
      this.response.end(this.body);
    } else {
      // Handle the case where the file does not exist
      this.setStatus(404).send("File not found");
    }
    return this;
  }

  /**
   * Sets the response header to "Content-Type: application/json",
   * stringifies the given body, writes the response header and body,
   * and returns itself.
   *
   * @param {any} body - The body to be converted to JSON and sent as the response.
   * @return {Object} - The current object instance.
   */
  json(body) {
    this.setHeader("Content-Type", "application/json");
    this.body = JSON.stringify(body);
    this.response.writeHead(this.statusCode, this.headers);
    this.response.end(this.body);
    return this;
  }

  /**
   * Renders a file using the specified view engine and options.
   *
   * @param {string} file - The file to render.
   * @param {object} options - The options to use during rendering.
   * @return {object} The current instance of the class.
   */
  render(file, options) {
    const viewEngine = this.viewEngine;
    if (viewEngine) {
      if (viewEngine == "html") {
        const renderEngine = new RenderEngines();
        const engine = renderEngine.getRenderer(this.viewEngine);
        this.body = engine(file, options);
        this.rendered = true;
        this.setHeader("Content-Type", "text/html");
        this.response.writeHead(this.statusCode, this.headers);
        this.response.end(this.body);
        return this;
      } else {
        const renderEngine = new RenderEngines();
        const engine = renderEngine.getRenderer(this.viewEngine);
        this.body = engine(file, options);
        this.rendered = true;
        this.setHeader("Content-Type", "text/html");
        this.response.writeHead(this.statusCode, this.headers);
        this.response.end(this.body);
        return this;
      }
    } else {
      this.renderedFile = path.join(this.mainPath, file + ".html");
      this.rendered = true;
      this.setHeader("Content-Type", "text/html");
      this.body = fs.readFileSync(this.renderedFile, "utf8");
      this.response.writeHead(this.statusCode, this.headers);
      this.response.end(this.body);
      return this;
    }
  }

  /**
   * Ends the response and returns the current object.
   *
   * @return {Object} - The current object.
   */
  end() {
    this.response.end();

    return this;
  }
}

module.exports = {
  Response,
};
