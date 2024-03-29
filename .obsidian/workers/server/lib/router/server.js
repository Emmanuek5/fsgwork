const http = require("http");
const https = require("https");
const { Request } = require("./request");
const { Response } = require("./response");
const event = require("events");
const { Router } = require("./router");
const eventEmitter = new event.EventEmitter();
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");
const COOKIES_DIR = path.join(process.cwd(), ".obsidian/cookies");
const uuid = require("uuid");
const sessions = [];
const zlib = require("zlib"); //
const url = require("url");
const ObsidianError = require("../../../../classes/ObsidianError");
const sessionManager = require("../../../../workers/server/lib/utils/sessions");

class Server extends event.EventEmitter {
  constructor(viewEngine, options = {}) {
    super();

    // Create an HTTP server
    this.server = http.createServer(this.handleRequest.bind(this));
    this.sessionManager = new sessionManager(COOKIES_DIR);
    this.not_found_html = fs.readFileSync(options.not_found, "utf-8");

    // Check if certificate and key options are provided for HTTPS
    if (options.cert && options.key) {
      // Create an HTTPS server with certificate and key to listen on port 443
      this.httpsServer = https.createServer(
        {
          cert: fs.readFileSync(options.cert),
          key: fs.readFileSync(options.key),
        },
        this.handleRequest.bind(this)
      );
      this.httpsServer.listen(443);
    } else {
    }

    this.routes = {};
    this.on = eventEmitter.on;
    this.emit = eventEmitter.emit;
    this.viewEngine = viewEngine;

    if (!fs.existsSync(COOKIES_DIR)) {
      fs.mkdirSync(COOKIES_DIR, { recursive: true });
    }
  }

  handleRequest(req, res) {
    const request = new Request(req);
    const response = new Response(res);

    response.viewEngine = this.viewEngine;
    response.req_headers = request.headers;

    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("multipart/form-data")
    ) {
    } else {
      request.chunkBody();
    }

    // Record the start time when the request is received
    const startTime = new Date();

    // Parse the body and handle the request
    this.sessionManager.setupSession(request, response);
    this.parseRequestBody(request)
      .then(() => {
        this.handleParsedRequest(request, response, startTime);
      })
      .catch((error) => {
        console.error("Error parsing request body:", error);
      });
  }

  /**
   * Sets up a session for the given request.
   *
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @return {void} This function does not return anything.
   */
  setupSession(request, response) {
    const sessionId = request.cookies["session_id"];

    if (sessionId) {
      // Load existing session
      request.session = this.loadSession(sessionId);
      if (request.session.user) {
        request.user = request.session.user;
      }

      request.session.save = () => {
        this.saveSession(request.session);
      };

      request.session.destroy = () => {
        request.session = this.createSession(sessionId);
        this.saveSession(request.session);
      };
    } else {
      // Create a new session
      const newSessionId = uuid.v4();
      request.session = this.createSession(newSessionId);

      request.session.save = () => {
        this.saveSession(request.session);
      };

      request.session.destroy = () => {
        request.session = this.createSession(sessionId);
        this.saveSession(request.session);
      };

      // Set the session ID cookie in the response
      response.setCookie("session_id", newSessionId);
    }
  }

  createSession(sessionId) {
    const session = {
      id: sessionId,
      data: {},
    };
    this.saveSession(session);
    return session;
  }

  loadSession(sessionId) {
    const sessionFilePath = path.join(COOKIES_DIR, `${sessionId}.json`);

    try {
      if (fs.existsSync(sessionFilePath)) {
        const sessionData = fs.readFileSync(sessionFilePath, "utf-8");
        const session = JSON.parse(sessionData);
        return session;
      } else {
        return this.createSession(sessionId);
      }
    } catch (error) {
      // Session file not found or invalid, create a new session
      console.error("Error loading session:", error);
      return this.createSession(sessionId);
    }
  }

  saveSession(session) {
    const sessionFilePath = path.join(COOKIES_DIR, `${session.id}.json`);
    fs.writeFileSync(sessionFilePath, JSON.stringify(session), "utf-8");
  }
  /**
   * Parses the request body based on the content type.
   *
   * @param {Request} request - The request object.
   * @return {Promise} A promise that resolves when the body is parsed.
   */
  async parseRequestBody(request) {
    return new Promise(async (resolve, reject) => {
      const contentType = request.headers["content-type"];
      if (contentType && contentType.includes("application/json")) {
        // Parse JSON body
        request.toJSON();
        resolve();
      } else if (contentType && contentType.includes("multipart/form-data")) {
        // Parse multipart/form-data
        await request.parseFormData().then(() => {
          resolve();
        });
      } else if (
        contentType &&
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        // Parse x-www-form-urlencoded
        request.parseFormUrlEncoded();
        resolve();
      } else {
        // No parsing needed for other content types
        resolve();
      }
    });
  }

  handleParsedRequest(request, response, startTime) {
    const { path, method } = request;

    // Parse query parameters from the request URL
    const queryParameters = this.parseQueryParameters(request);
    request.params = queryParameters;

    // Find the route handler based on path and method
    const routeHandlers = this.findRouteHandler(path, method, request); // Fix the function name here

    if (routeHandlers) {
      // If route handlers are found, execute them and pass queryParameters
      const executeHandler = (handlerIndex) => {
        if (handlerIndex < routeHandlers.length) {
          const handler = routeHandlers[handlerIndex];
          if (typeof handler === "function") {
            handler(request, response, () => {
              executeHandler(handlerIndex + 1);
            });
          } else {
            console.error(
              `Handler at index ${handlerIndex} is not a function.`
            );
          }
        }
      };

      executeHandler(0);

      // Calculate the time taken to process the request in milliseconds
      const endTime = new Date();
      const elapsedTime = endTime - startTime;
      const ip = request.ip
        .replace("::ffff:", "")
        .split(".")
        .map((segment, index) => (index === 0 || index >= 3 ? segment : "xxx"))
        .join(".");
      console.log(
        ` ${ip} ${request.method} ${request.path} ${response.statusCode}  ${elapsedTime}ms`
      );
    } else {
      // Handle the case where no route handlers are found
      const endTime = new Date();
      const elapsedTime = endTime - startTime;
      const ip = request.ip
        .replace("::ffff:", "")
        .split(".")
        .map((segment, index) => (index === 0 || index >= 3 ? segment : "xxx"))
        .join(".");

      response.setStatus(404).send(this.not_found_html);
      console.log(
        ` ${ip}  ${request.method}  ${request.path}  ${response.statusCode}  ${elapsedTime}ms`
      );
    }
  }

  /**
   * Parse query parameters from the request URL.
   *
   * @param {Request} request - The request object.
   * @returns {Object} - An object containing the parsed query parameters.
   */
  parseQueryParameters(request) {
    const { path } = request;
    const queryParameters = {};

    // Check if the path contains a query string
    if (path.includes("?")) {
      const queryString = path.split("?")[1];
      const queryParams = queryString.split("&");

      queryParams.forEach((param) => {
        const [key, value] = param.split("=");
        queryParameters[key] = value;
      });
    }

    return queryParameters;
  }

  /**
   * Use the specified file to add routes to the server.
   *
   * @param {string} file - The path of the file to require.
   * @param {string} basePath - The base path under which to add the routes.
   * @throws {Error} Throws an error if the file does not export an instance of the Router class.
   */
  use(file, basePath) {
    // Check if the file is a directory
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.isDirectory()) {
        // Serve all files in the directory when the basePath is accessed
        this.addRoute(basePath, "GET", (req, res) => {
          let html = "<ul>";
          fs.readdirSync(file).forEach((fileName) => {
            const filePath = path.join(file, fileName); // Use path.join to create file paths
            const routePath = path.join(basePath, fileName).replace(/\\/g, "/"); // Replace backslashes with forward slashes
            html += `<li><a href="${routePath}">${fileName}</a></li>`;
          });
          html += "</ul>";
          res.send(html);
        });

        fs.readdirSync(file).forEach((fileName) => {
          const filePath = path.join(file, fileName); // Use path.join for file paths
          const routePath = path.join(basePath, fileName).replace(/\\/g, "/"); // Replace backslashes with forward slashes
          // Check if the current file is a directory
          const fileStats = fs.statSync(filePath);
          if (fileStats.isDirectory()) {
            // Serve all files in the directory
            this.dir(filePath, routePath);
          } else {
            // Serve the file
            this.addRoute(routePath, "GET", (req, res) => {
              //check if the file is a js, css or html
              const ext = path.extname(filePath);
              if (ext === ".js" || ext === ".css" || ext === ".html") {
                //reduce cache time to 10 minutes
                res.setHeader("Cache-Control", "public, max-age=600");
                res.setHeader(
                  "Expires",
                  new Date(Date.now() + 600000).toUTCString()
                );
                res.file(filePath);

                return;
              }
              //set cache time to 1 day
              res.setHeader("Cache-Control", "public, max-age=86400");
              res.setHeader(
                "Expires",
                new Date(Date.now() + 86400000).toUTCString()
              );
              res.file(filePath);
            });
          }
        });
      } else {
        const routerModule = require(file);
        const addRouteWithBasePath = (routePath, method, handler) => {
          const fullPath = path.join(basePath, routePath).replace(/\\/g, "/");
          this.addRoute(fullPath, method, handler);
        };
        // Check if the file is a Router instance or has routes
        if (routerModule instanceof Router || routerModule.routes) {
          // Add your existing route handling logic here
          const routerRoutes = routerModule.routes;

          if (!this.routes[basePath]) {
            this.routes[basePath] = {};
          }

          for (const path in routerRoutes) {
            for (const method in routerRoutes[path]) {
              addRouteWithBasePath(path, method, routerRoutes[path][method]);
            }
          }
        } else {
          throw new Error(
            "Expected a Router instance or directory, Received something else: " +
              routerModule
          );
        }
      }
    } else {
      throw new Error("File does not exist: " + file);
    }
  }

  /**
   * Adds a route to the API.
   *
   * @param {string} path - The URL path of the route.
   * @param {string} method - The HTTP method of the route.
   * @param {function} handler - The handler function for the route.
   */
  addRoute(path, method, handlers) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    if (!this.routes[path][method]) {
      this.routes[path][method] = [];
    }

    // Ensure handlers is an array
    const handlersArray = Array.isArray(handlers) ? handlers : [handlers];
    this.routes[path][method] = this.routes[path][method].concat(handlersArray);
  }
  /**
   * Find the route handler based on the given path and method.
   *
   * @param {string} path - The URL path of the route.
   * @param {string} method - The HTTP method of the route.
   * @returns {function|null} - The route handler function or null if not found.
   */

  /**
   * Find the route handler based on the given path and method.
   *
   * @param {string} path - The URL path of the route.
   * @param {string} method - The HTTP method of the route.
   * @returns {function|null} - The route handler function or null if not found.
   */
  findRouteHandler(path, method, request) {
    // Try to find the exact route handler first
    const routeHandlers = this.routes[path];
    if (routeHandlers && routeHandlers[method]) {
      return routeHandlers[method];
    }

    // If an exact route handler is not found, try to find a route without query parameters

    const pathWithoutQuery = this.getPathWithoutQuery(path);
    if (pathWithoutQuery !== path) {
      const routeHandlersWithoutQuery = this.routes[pathWithoutQuery];
      if (routeHandlersWithoutQuery && routeHandlersWithoutQuery[method]) {
        return routeHandlersWithoutQuery[method];
      }
    }

    // Try to find a dynamic route handler
    const dynamicRouteHandler = this.findDynamicRouteHandler(
      path,
      method,
      request
    );
    if (dynamicRouteHandler) {
      return dynamicRouteHandler;
    }

    // Try to find an open-ended URL handler
    const openEndedUrlHandler = this.findOpenEndedUrlHandler(path, method);
    if (openEndedUrlHandler) {
      return openEndedUrlHandler;
    }

    return null;
  }
  // ...
  findOpenEndedUrlHandler(path, method) {
    for (const routePath in this.routes) {
      if (routePath.endsWith("/*") && path.startsWith(routePath.slice(0, -2))) {
        const routeHandlers = this.routes[routePath];
        if (routeHandlers && routeHandlers[method]) {
          return routeHandlers[method];
        }
      }
    }

    return null;
  }

  /**
   * Find the route handler for dynamic routes.
   *
   * @param {string} path - The URL path of the route.
   * @param {string} method - The HTTP method of the route.
   * @returns {function|null} - The dynamic route handler function or null if not found.
   */
  findDynamicRouteHandler(path, method, request) {
    for (const routePath in this.routes) {
      if (this.routes.hasOwnProperty(routePath)) {
        const paramNames = [];
        const routePathSegments = routePath.split("/");
        const pathSegments = path.split("/");

        // Check if the routePath has dynamic parameters
        const isDynamic = routePathSegments.some((segment) => {
          if (segment.startsWith(":")) {
            paramNames.push(segment.substring(1));
            return true;
          }
          return false;
        });

        if (isDynamic && pathSegments.length === routePathSegments.length) {
          let isMatch = true;
          const params = {};

          for (let i = 0; i < pathSegments.length; i++) {
            const routeSegment = routePathSegments[i];
            const pathSegment = pathSegments[i];

            if (routeSegment.startsWith(":")) {
              // Dynamic parameter, store its value
              const paramName = routeSegment.substring(1);
              params[paramName] = pathSegment;
            } else if (routeSegment !== pathSegment) {
              // Segments don't match
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            // Found a match for dynamic route parameters

            if (this.routes[routePath][method]) {
              request.params = params;
              return this.routes[routePath][method];
            } else {
              return null;
            }
          }
        }
      }
    }

    return null;
  }
  getPathWithoutQuery(url_path) {
    return url_path.split("?")[0];
  }
  dir(dirPath, httpPath) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new ObsidianError("Directory does not exist: " + dirPath);
    }

    this.addRoute(httpPath + "/*", "GET", (req, res) => {
      let urlPath = req.path;

      // Remove the httpPath from the urlPath
      urlPath = urlPath.replace(httpPath, "");

      // Decode URL-encoded characters
      urlPath = decodeURIComponent(urlPath);

      const filePath = path.join(dirPath, urlPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.file(filePath);
      } else {
        res.send(this.not_found_html).status(404);
      }
    });
  }

  listen(startingPort, callback) {
    let port = startingPort;

    const tryListening = () => {
      this.server.listen(port, () => {
        if (callback) {
          callback(port);
        }
        this.emit("listening");
      });

      this.server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          console.log(`Port ${port} is in use, trying the next one...`);
          port++;
          tryListening(); // Try the next port
        } else {
          throw error; // Throw other errors
        }
      });
    };

    tryListening(); // Start listening on the specified port
  }

  setViewEngine(viewEngine) {
    this.viewEngine = viewEngine;
  }

  getHttpServer() {
    return this.server;
  }
}

module.exports = {
  Server,
  eventEmitter,
};
