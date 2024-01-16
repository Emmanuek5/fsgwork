const { RouteHandler } = require("./RouteHandler");
const { Request } = require("./request");
const { Response } = require("./response");

/**
 * Class representing a router for handling HTTP requests.
 */
class Router {
  /**
   * Creates a new instance of the Router class.
   */
  constructor() {
    /**
     * Object to store routes.
     * @type {Object.<string, Object.<string, RouteHandler[]>>}
     */
    this.routes = {};

    /**
     * Base path for routes.
     * @type {string}
     */
    this.basePath = "";
  }

  /**
   * Adds a new route for handling HTTP requests.
   *
   * @param {string} method - The HTTP method for the route.
   * @param {string} path - The URL path of the route.
   * @param {function(Request, Response)[]} handlers - The handler functions for the route.
   * @returns {void}
   * @private
   */
  addRoute(method, path, ...handlers) {
    // Initialize this.routes[path] as an empty object if it doesn't exist
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    // Convert single handler to an array
    const handlerArray = Array.isArray(handlers) ? handlers : [handlers];

    this.routes[path][method] = handlerArray;
  }

  /**
   * Adds a new route for handling GET requests.
   *
   * @param {string} path - The URL path of the route.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  get(path, ...handlers) {
    this.addRoute("GET", path, ...handlers);
  }

  /**
   * Adds a new route for handling POST requests.
   *
   * @param {string} path - The path of the route.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  post(path, ...handlers) {
    this.addRoute("POST", path, ...handlers);
  }

  /**
   * Adds a new route for handling PUT requests.
   *
   * @param {string} path - The path of the route.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  put(path, ...handlers) {
    this.addRoute("PUT", path, ...handlers);
  }

  /**
   * Adds a new route for handling DELETE requests.
   *
   * @param {string} path - The path of the route.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  delete(path, ...handlers) {
    this.addRoute("DELETE", path, ...handlers);
  }

  /**
   * Patches a route with the specified path and handler.
   *
   * @param {string} path - The path of the route to patch.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  patch(path, ...handlers) {
    this.addRoute("PATCH", path, ...handlers);
  }

  /**
   * Adds a route for the HEAD HTTP method.
   *
   * @param {string} path - The path of the route.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  head(path, ...handlers) {
    this.addRoute("HEAD", path, ...handlers);
  }

  /**
   * Updates the specified path with the provided handler.
   *
   * @param {string} path - The path to update.
   * @param {...function(Request, Response)} handlers - The handler functions for the route.
   * @returns {void}
   */
  update(path, ...handlers) {
    this.addRoute("UPDATE", path, ...handlers);
  }
}

module.exports = {
  Router,
};
