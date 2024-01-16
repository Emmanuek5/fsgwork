const { Request } = require("./request");
const { Response } = require("./response");

/**
 * Class representing a handler for handling HTTP routes.
 */
class RouteHandler {
  /**
   * Initializes a new instance of the constructor.
   *
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   */
  constructor(req, res) {
    /**
     * The HTTP request object.
     * @type {Request}
     */
    this.req = req;

    /**
     * The HTTP response object.
     * @type {Response}
     */
    this.res = res;
  }

  static req = Request;
  static res = Response;
}

module.exports = {
  RouteHandler,
};
