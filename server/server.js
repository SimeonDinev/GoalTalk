(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory(
        require("http"),
        require("fs"),
        require("crypto")
      ))
    : typeof define === "function" && define.amd
    ? define(["http", "fs", "crypto"], factory)
    : ((global =
        typeof globalThis !== "undefined" ? globalThis : global || self),
      (global.Server = factory(global.http, global.fs, global.crypto)));
})(this, function (http, fs, crypto) {
  "use strict";

  function _interopDefaultLegacy(e) {
    return e && typeof e === "object" && "default" in e ? e : { default: e };
  }

  var http__default = /*#__PURE__*/ _interopDefaultLegacy(http);
  var fs__default = /*#__PURE__*/ _interopDefaultLegacy(fs);
  var crypto__default = /*#__PURE__*/ _interopDefaultLegacy(crypto);

  class ServiceError extends Error {
    constructor(message = "Service Error") {
      super(message);
      this.name = "ServiceError";
    }
  }

  class NotFoundError extends ServiceError {
    constructor(message = "Resource not found") {
      super(message);
      this.name = "NotFoundError";
      this.status = 404;
    }
  }

  class RequestError extends ServiceError {
    constructor(message = "Request error") {
      super(message);
      this.name = "RequestError";
      this.status = 400;
    }
  }

  class ConflictError extends ServiceError {
    constructor(message = "Resource conflict") {
      super(message);
      this.name = "ConflictError";
      this.status = 409;
    }
  }

  class AuthorizationError extends ServiceError {
    constructor(message = "Unauthorized") {
      super(message);
      this.name = "AuthorizationError";
      this.status = 401;
    }
  }

  class CredentialError extends ServiceError {
    constructor(message = "Forbidden") {
      super(message);
      this.name = "CredentialError";
      this.status = 403;
    }
  }

  var errors = {
    ServiceError,
    NotFoundError,
    RequestError,
    ConflictError,
    AuthorizationError,
    CredentialError,
  };

  const { ServiceError: ServiceError$1 } = errors;

  function createHandler(plugins, services) {
    return async function handler(req, res) {
      const method = req.method;
      console.info(`<< ${req.method} ${req.url}`);

      // Redirect fix for admin panel relative paths
      if (req.url.slice(-6) == "/admin") {
        res.writeHead(302, {
          Location: `http://${req.headers.host}/admin/`,
        });
        return res.end();
      }

      let status = 200;
      let headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      };
      let result = "";
      let context;

      // NOTE: the OPTIONS method results in undefined result and also it never processes plugins - keep this in mind
      if (method == "OPTIONS") {
        Object.assign(headers, {
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Credentials": false,
          "Access-Control-Max-Age": "86400",
          "Access-Control-Allow-Headers":
            "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin",
        });
      } else {
        try {
          context = processPlugins();
          await handle(context);
        } catch (err) {
          if (err instanceof ServiceError$1) {
            status = err.status || 400;
            result = composeErrorObject(err.code || status, err.message);
          } else {
            // Unhandled exception, this is due to an error in the service code - REST consumers should never have to encounter this;
            // If it happens, it must be debugged in a future version of the server
            console.error(err);
            status = 500;
            result = composeErrorObject(500, "Server Error");
          }
        }
      }

      res.writeHead(status, headers);
      if (
        context != undefined &&
        context.util != undefined &&
        context.util.throttle
      ) {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      }
      res.end(result);

      function processPlugins() {
        const context = { params: {} };
        plugins.forEach((decorate) => decorate(context, req));
        return context;
      }

      async function handle(context) {
        const { serviceName, tokens, query, body } = await parseRequest(req);
        if (serviceName == "admin") {
          return ({ headers, result } = services["admin"](
            method,
            tokens,
            query,
            body
          ));
        } else if (serviceName == "favicon.ico") {
          return ({ headers, result } = services["favicon"](
            method,
            tokens,
            query,
            body
          ));
        }

        const service = services[serviceName];

        if (service === undefined) {
          status = 400;
          result = composeErrorObject(
            400,
            `Service "${serviceName}" is not supported`
          );
          console.error("Missing service " + serviceName);
        } else {
          result = await service(context, { method, tokens, query, body });
        }

        // NOTE: logout does not return a result
        // in this case the content type header should be omitted, to allow checks on the client
        if (result !== undefined) {
          result = JSON.stringify(result);
        } else {
          status = 204;
          delete headers["Content-Type"];
        }
      }
    };
  }

  function composeErrorObject(code, message) {
    return JSON.stringify({
      code,
      message,
    });
  }

  async function parseRequest(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tokens = url.pathname.split("/").filter((x) => x.length > 0);
    const serviceName = tokens.shift();
    const queryString = url.search.split("?")[1] || "";
    const query = queryString
      .split("&")
      .filter((s) => s != "")
      .map((x) => x.split("="))
      .reduce(
        (p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v) }),
        {}
      );
    const body = await parseBody(req);

    return {
      serviceName,
      tokens,
      query,
      body,
    };
  }

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          resolve(body);
        }
      });
    });
  }

  var requestHandler = createHandler;

  class Service {
    constructor() {
      this._actions = [];
      this.parseRequest = this.parseRequest.bind(this);
    }

    /**
     * Handle service request, after it has been processed by a request handler
     * @param {*} context Execution context, contains result of middleware processing
     * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
     */
    async parseRequest(context, request) {
      for (let { method, name, handler } of this._actions) {
        if (
          method === request.method &&
          matchAndAssignParams(context, request.tokens[0], name)
        ) {
          return await handler(
            context,
            request.tokens.slice(1),
            request.query,
            request.body
          );
        }
      }
    }

    /**
     * Register service action
     * @param {string} method HTTP method
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    registerAction(method, name, handler) {
      this._actions.push({ method, name, handler });
    }

    /**
     * Register GET action
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    get(name, handler) {
      this.registerAction("GET", name, handler);
    }

    /**
     * Register POST action
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    post(name, handler) {
      this.registerAction("POST", name, handler);
    }

    /**
     * Register PUT action
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    put(name, handler) {
      this.registerAction("PUT", name, handler);
    }

    /**
     * Register PATCH action
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    patch(name, handler) {
      this.registerAction("PATCH", name, handler);
    }

    /**
     * Register DELETE action
     * @param {string} name Action name. Can be a glob pattern.
     * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
     */
    delete(name, handler) {
      this.registerAction("DELETE", name, handler);
    }
  }

  function matchAndAssignParams(context, name, pattern) {
    if (pattern == "*") {
      return true;
    } else if (pattern[0] == ":") {
      context.params[pattern.slice(1)] = name;
      return true;
    } else if (name == pattern) {
      return true;
    } else {
      return false;
    }
  }

  var Service_1 = Service;

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        let r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  var util = {
    uuid,
  };

  const uuid$1 = util.uuid;

  const data = fs__default["default"].existsSync("./data")
    ? fs__default["default"].readdirSync("./data").reduce((p, c) => {
        const content = JSON.parse(
          fs__default["default"].readFileSync("./data/" + c)
        );
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
          p[collection][endpoint] = content[endpoint];
        }
        return p;
      }, {})
    : {};

  const actions = {
    get: (context, tokens, query, body) => {
      tokens = [context.params.collection, ...tokens];
      let responseData = data;
      for (let token of tokens) {
        if (responseData !== undefined) {
          responseData = responseData[token];
        }
      }
      return responseData;
    },
    post: (context, tokens, query, body) => {
      tokens = [context.params.collection, ...tokens];
      console.log("Request body:\n", body);

      // TODO handle collisions, replacement
      let responseData = data;
      for (let token of tokens) {
        if (responseData.hasOwnProperty(token) == false) {
          responseData[token] = {};
        }
        responseData = responseData[token];
      }

      const newId = uuid$1();
      responseData[newId] = Object.assign({}, body, { _id: newId });
      return responseData[newId];
    },
    put: (context, tokens, query, body) => {
      tokens = [context.params.collection, ...tokens];
      console.log("Request body:\n", body);

      let responseData = data;
      for (let token of tokens.slice(0, -1)) {
        if (responseData !== undefined) {
          responseData = responseData[token];
        }
      }
      if (
        responseData !== undefined &&
        responseData[tokens.slice(-1)] !== undefined
      ) {
        responseData[tokens.slice(-1)] = body;
      }
      return responseData[tokens.slice(-1)];
    },
    patch: (context, tokens, query, body) => {
      tokens = [context.params.collection, ...tokens];
      console.log("Request body:\n", body);

      let responseData = data;
      for (let token of tokens) {
        if (responseData !== undefined) {
          responseData = responseData[token];
        }
      }
      if (responseData !== undefined) {
        Object.assign(responseData, body);
      }
      return responseData;
    },
    delete: (context, tokens, query, body) => {
      tokens = [context.params.collection, ...tokens];
      let responseData = data;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (responseData.hasOwnProperty(token) == false) {
          return null;
        }
        if (i == tokens.length - 1) {
          const body = responseData[token];
          delete responseData[token];
          return body;
        } else {
          responseData = responseData[token];
        }
      }
    },
  };

  const dataService = new Service_1();
  dataService.get(":collection", actions.get);
  dataService.post(":collection", actions.post);
  dataService.put(":collection", actions.put);
  dataService.patch(":collection", actions.patch);
  dataService.delete(":collection", actions.delete);

  var jsonstore = dataService.parseRequest;

  /*
   * This service requires storage and auth plugins
   */

  const { AuthorizationError: AuthorizationError$1 } = errors;

  const userService = new Service_1();

  userService.get("me", getSelf);
  userService.post("register", onRegister);
  userService.post("login", onLogin);
  userService.get("logout", onLogout);

  function getSelf(context, tokens, query, body) {
    if (context.user) {
      const result = Object.assign({}, context.user);
      delete result.hashedPassword;
      return result;
    } else {
      throw new AuthorizationError$1();
    }
  }

  function onRegister(context, tokens, query, body) {
    return context.auth.register(body);
  }

  function onLogin(context, tokens, query, body) {
    return context.auth.login(body);
  }

  function onLogout(context, tokens, query, body) {
    return context.auth.logout();
  }

  var users = userService.parseRequest;

  const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } =
    errors;

  var crud = {
    get,
    post,
    put,
    patch,
    delete: del,
  };

  function validateRequest(context, tokens, query) {
    /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
    if (tokens.length > 1) {
      throw new RequestError$1();
    }
  }

  function parseWhere(query) {
    const operators = {
      "<=": (prop, value) => (record) => record[prop] <= JSON.parse(value),
      "<": (prop, value) => (record) => record[prop] < JSON.parse(value),
      ">=": (prop, value) => (record) => record[prop] >= JSON.parse(value),
      ">": (prop, value) => (record) => record[prop] > JSON.parse(value),
      "=": (prop, value) => (record) => record[prop] == JSON.parse(value),
      " like ": (prop, value) => (record) =>
        record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
      " in ": (prop, value) => (record) =>
        JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
    };
    const pattern = new RegExp(
      `^(.+?)(${Object.keys(operators).join("|")})(.+?)$`,
      "i"
    );

    try {
      let clauses = [query.trim()];
      let check = (a, b) => b;
      let acc = true;
      if (query.match(/ and /gi)) {
        // inclusive
        clauses = query.split(/ and /gi);
        check = (a, b) => a && b;
        acc = true;
      } else if (query.match(/ or /gi)) {
        // optional
        clauses = query.split(/ or /gi);
        check = (a, b) => a || b;
        acc = false;
      }
      clauses = clauses.map(createChecker);

      return (record) => clauses.map((c) => c(record)).reduce(check, acc);
    } catch (err) {
      throw new Error("Could not parse WHERE clause, check your syntax.");
    }

    function createChecker(clause) {
      let [match, prop, operator, value] = pattern.exec(clause);
      [prop, value] = [prop.trim(), value.trim()];

      return operators[operator.toLowerCase()](prop, value);
    }
  }

  function get(context, tokens, query, body) {
    validateRequest(context, tokens);

    let responseData;

    try {
      if (query.where) {
        responseData = context.storage
          .get(context.params.collection)
          .filter(parseWhere(query.where));
      } else if (context.params.collection) {
        responseData = context.storage.get(
          context.params.collection,
          tokens[0]
        );
      } else {
        // Get list of collections
        return context.storage.get();
      }

      if (query.sortBy) {
        const props = query.sortBy
          .split(",")
          .filter((p) => p != "")
          .map((p) => p.split(" ").filter((p) => p != ""))
          .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));

        // Sorting priority is from first to last, therefore we sort from last to first
        for (let i = props.length - 1; i >= 0; i--) {
          let { prop, desc } = props[i];
          responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
            if (typeof propA == "number" && typeof propB == "number") {
              return (propA - propB) * (desc ? -1 : 1);
            } else {
              return propA.localeCompare(propB) * (desc ? -1 : 1);
            }
          });
        }
      }

      if (query.offset) {
        responseData = responseData.slice(Number(query.offset) || 0);
      }
      const pageSize = Number(query.pageSize) || 10;
      if (query.pageSize) {
        responseData = responseData.slice(0, pageSize);
      }

      if (query.distinct) {
        const props = query.distinct.split(",").filter((p) => p != "");
        responseData = Object.values(
          responseData.reduce((distinct, c) => {
            const key = props.map((p) => c[p]).join("::");
            if (distinct.hasOwnProperty(key) == false) {
              distinct[key] = c;
            }
            return distinct;
          }, {})
        );
      }

      if (query.count) {
        return responseData.length;
      }

      if (query.select) {
        const props = query.select.split(",").filter((p) => p != "");
        responseData = Array.isArray(responseData)
          ? responseData.map(transform)
          : transform(responseData);

        function transform(r) {
          const result = {};
          props.forEach((p) => (result[p] = r[p]));
          return result;
        }
      }

      if (query.load) {
        const props = query.load.split(",").filter((p) => p != "");
        props.map((prop) => {
          const [propName, relationTokens] = prop.split("=");
          const [idSource, collection] = relationTokens.split(":");
          console.log(
            `Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`
          );
          const storageSource =
            collection == "users" ? context.protectedStorage : context.storage;
          responseData = Array.isArray(responseData)
            ? responseData.map(transform)
            : transform(responseData);

          function transform(r) {
            const seekId = r[idSource];
            const related = storageSource.get(collection, seekId);
            delete related.hashedPassword;
            r[propName] = related;
            return r;
          }
        });
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes("does not exist")) {
        throw new NotFoundError$1();
      } else {
        throw new RequestError$1(err.message);
      }
    }

    context.canAccess(responseData);

    return responseData;
  }

  function post(context, tokens, query, body) {
    console.log("Request body:\n", body);

    validateRequest(context, tokens);
    if (tokens.length > 0) {
      throw new RequestError$1("Use PUT to update records");
    }
    context.canAccess(undefined, body);

    body._ownerId = context.user._id;
    let responseData;

    try {
      responseData = context.storage.add(context.params.collection, body);
    } catch (err) {
      throw new RequestError$1();
    }

    return responseData;
  }

  function put(context, tokens, query, body) {
    console.log("Request body:\n", body);

    validateRequest(context, tokens);
    if (tokens.length != 1) {
      throw new RequestError$1("Missing entry ID");
    }

    let responseData;
    let existing;

    try {
      existing = context.storage.get(context.params.collection, tokens[0]);
    } catch (err) {
      throw new NotFoundError$1();
    }

    context.canAccess(existing, body);

    try {
      responseData = context.storage.set(
        context.params.collection,
        tokens[0],
        body
      );
    } catch (err) {
      throw new RequestError$1();
    }

    return responseData;
  }

  function patch(context, tokens, query, body) {
    console.log("Request body:\n", body);

    validateRequest(context, tokens);
    if (tokens.length != 1) {
      throw new RequestError$1("Missing entry ID");
    }

    let responseData;
    let existing;

    try {
      existing = context.storage.get(context.params.collection, tokens[0]);
    } catch (err) {
      throw new NotFoundError$1();
    }

    context.canAccess(existing, body);

    try {
      responseData = context.storage.merge(
        context.params.collection,
        tokens[0],
        body
      );
    } catch (err) {
      throw new RequestError$1();
    }

    return responseData;
  }

  function del(context, tokens, query, body) {
    validateRequest(context, tokens);
    if (tokens.length != 1) {
      throw new RequestError$1("Missing entry ID");
    }

    let responseData;
    let existing;

    try {
      existing = context.storage.get(context.params.collection, tokens[0]);
    } catch (err) {
      throw new NotFoundError$1();
    }

    context.canAccess(existing);

    try {
      responseData = context.storage.delete(
        context.params.collection,
        tokens[0]
      );
    } catch (err) {
      throw new RequestError$1();
    }

    return responseData;
  }

  /*
   * This service requires storage and auth plugins
   */

  const dataService$1 = new Service_1();
  dataService$1.get(":collection", crud.get);
  dataService$1.post(":collection", crud.post);
  dataService$1.put(":collection", crud.put);
  dataService$1.patch(":collection", crud.patch);
  dataService$1.delete(":collection", crud.delete);

  var data$1 = dataService$1.parseRequest;

  const imgdata =
    "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAPNnpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHja7ZpZdiS7DUT/uQovgSQ4LofjOd6Bl+8LZqpULbWm7vdnqyRVKQeCBAKBAFNm/eff2/yLr2hzMSHmkmpKlq9QQ/WND8VeX+38djac3+cr3af4+5fj5nHCc0h4l+vP8nJicdxzeN7Hxz1O43h8Gmi0+0T/9cT09/jlNuAeBs+XuMuAvQ2YeQ8k/jrhwj2Re3mplvy8hH3PKPr7SLl+jP6KkmL2OeErPnmbQ9q8Rmb0c2ynxafzO+eET7mC65JPjrM95exN2jmmlYLnophSTKLDZH+GGAwWM0cyt3C8nsHWWeG4Z/Tio7cHQiZ2M7JK8X6JE3t++2v5oj9O2nlvfApc50SkGQ5FDnm5B2PezJ8Bw1PUPvl6cYv5G788u8V82y/lPTgfn4CC+e2JN+Ds5T4ubzCVHu8M9JsTLr65QR5m/LPhvh6G/S8zcs75XzxZXn/2nmXvda2uhURs051x51bzMgwXdmIl57bEK/MT+ZzPq/IqJPEA+dMO23kNV50HH9sFN41rbrvlJu/DDeaoMci8ez+AjB4rkn31QxQxQV9u+yxVphRgM8CZSDDiH3Nxx2499oYrWJ6OS71jMCD5+ct8dcF3XptMNupie4XXXQH26nCmoZHT31xGQNy+4xaPg19ejy/zFFghgvG4ubDAZvs1RI/uFVtyACBcF3m/0sjlqVHzByUB25HJOCEENjmJLjkL2LNzQXwhQI2Ze7K0EwEXo59M0geRRGwKOMI292R3rvXRX8fhbuJDRkomNlUawQohgp8cChhqUWKIMZKxscQamyEBScaU0knM1E6WxUxO5pJrbkVKKLGkkksptbTqq1AjYiWLa6m1tobNFkyLjbsbV7TWfZceeuyp51567W0AnxFG1EweZdTRpp8yIayZZp5l1tmWI6fFrLDiSiuvsupqG6xt2WFHOCXvsutuj6jdUX33+kHU3B01fyKl1+VH1Diasw50hnDKM1FjRsR8cEQ8awQAtNeY2eJC8Bo5jZmtnqyInklGjc10thmXCGFYzsftHrF7jdy342bw9Vdx89+JnNHQ/QOR82bJm7j9JmqnGo8TsSsL1adWyD7Or9J8aTjbXx/+9v3/A/1vDUS9tHOXtLaM6JoBquRHJFHdaNU5oF9rKVSjYNewoFNsW032cqqCCx/yljA2cOy7+7zJ0biaicv1TcrWXSDXVT3SpkldUqqPIJj8p9oeWVs4upKL3ZHgpNzYnTRv5EeTYXpahYRgfC+L/FyxBphCmPLK3W1Zu1QZljTMJe5AIqmOyl0qlaFCCJbaPAIMWXzurWAMXiB1fGDtc+ld0ZU12k5cQq4v7+AB2x3qLlQ3hyU/uWdzzgUTKfXSputZRtp97hZ3z4EE36WE7WtjbqMtMr912oRp47HloZDlywxJ+uyzmrW91OivysrM1Mt1rZbrrmXm2jZrYWVuF9xZVB22jM4ccdaE0kh5jIrnzBy5w6U92yZzS1wrEao2ZPnE0tL0eRIpW1dOWuZ1WlLTqm7IdCESsV5RxjQ1/KWC/y/fPxoINmQZI8Cli9oOU+MJYgrv006VQbRGC2Ug8TYzrdtUHNjnfVc6/oN8r7tywa81XHdZN1QBUhfgzRLzmPCxu1G4sjlRvmF4R/mCYdUoF2BYNMq4AjD2GkMGhEt7PAJfKrH1kHmj8eukyLb1oCGW/WdAtx0cURYqtcGnNlAqods6UnaRpY3LY8GFbPeSrjKmsvhKnWTtdYKhRW3TImUqObdpGZgv3ltrdPwwtD+l1FD/htxAwjdUzhtIkWNVy+wBUmDtphwgVemd8jV1miFXWTpumqiqvnNuArCrFMbLPexJYpABbamrLiztZEIeYPasgVbnz9/NZxe4p/B+FV3zGt79B9S0Jc0Lu+YH4FXsAsa2YnRIAb2thQmGc17WdNd9cx4+y4P89EiVRKB+CvRkiPTwM7Ts+aZ5aV0C4zGoqyOGJv3yGMJaHXajKbOGkm40Ychlkw6c6hZ4s+SDJpsmncwmm8ChEmBWspX8MkFB+kzF1ZlgoGWiwzY6w4AIPDOcJxV3rtUnabEgoNBB4MbNm8GlluVIpsboaKl0YR8kGnXZH3JQZrH2MDxxRrHFUduh+CvQszakraM9XNo7rEVjt8VpbSOnSyD5dwLfVI4+Sl+DCZc5zU6zhrXnRhZqUowkruyZupZEm/dA2uVTroDg1nfdJMBua9yCJ8QPtGw2rkzlYLik5SBzUGSoOqBMJvwTe92eGgOVx8/T39TP0r/PYgfkP1IEyGVhYHXyJiVPU0skB3dGqle6OZuwj/Hw5c2gV5nEM6TYaAryq3CRXsj1088XNwt0qcliqNc6bfW+TttRydKpeJOUWTmmUiwJKzpr6hkVzzLrVs+s66xEiCwOzfg5IRgwQgFgrriRlg6WQS/nGyRUNDjulWsUbO8qu/lWaWeFe8QTs0puzrxXH1H0b91KgDm2dkdrpkpx8Ks2zZu4K1GHPpDxPdCL0RH0SZZrGX8hRKTA+oUPzQ+I0K1C16ZSK6TR28HUdlnfpzMsIvd4TR7iuSe/+pn8vief46IQULRGcHvRVUyn9aYeoHbGhEbct+vEuzIxhxJrgk1oyo3AFA7eSSSNI/Vxl0eLMCrJ/j1QH0ybj0C9VCn9BtXbz6Kd10b8QKtpTnecbnKHWZxcK2OiKCuViBHqrzM2T1uFlGJlMKFKRF1Zy6wMqQYtgKYc4PFoGv2dX2ixqGaoFDhjzRmp4fsygFZr3t0GmBqeqbcBFpvsMVCNajVWcLRaPBhRKc4RCCUGZphKJdisKdRjDKdaNbZfwM5BulzzCvyv0AsAlu8HOAdIXAuMAg0mWa0+0vgrODoHlm7Y7rXUHmm9r2RTLpXwOfOaT6iZdASpqOIXfiABLwQkrSPFXQgAMHjYyEVrOBESVgS4g4AxcXyiPwBiCF6g2XTPk0hqn4D67rbQVFv0Lam6Vfmvq90B3WgV+peoNRb702/tesrImcBCvIEaGoI/8YpKa1XmDNr1aGUwjDETBa3VkOLYVLGKeWQcd+WaUlsMdTdUg3TcUPvdT20ftDW4+injyAarDRVVRgc906sNTo1cu7LkDGewjkQ35Z7l4Htnx9MCkbenKiNMsif+5BNVnA6op3gZVZtjIAacNia+00w1ZutIibTMOJ7IISctvEQGDxEYDUSxUiH4R4kkH86dMywCqVJ2XpzkUYUgW3mDPmz0HLW6w9daRn7abZmo4QR5i/A21r4oEvCC31oajm5CR1yBZcIfN7rmgxM9qZBhXh3C6NR9dCS1PTMJ30c4fEcwkq0IXdphpB9eg4x1zycsof4t6C4jyS68eW7OonpSEYCzb5dWjQH3H5fWq2SH41O4LahPrSJA77KqpJYwH6pdxDfDIgxLR9GptCKMoiHETrJ0wFSR3Sk7yI97KdBVSHXeS5FBnYKIz1JU6VhdCkfHIP42o0V6aqgg00JtZfdK6hPeojtXvgfnE/VX0p0+fqxp2/nDfvBuHgeo7ppkrr/MyU1dT73n5B/qi76+lzMnVnHRJDeZOyj3XXdQrrtOUPQunDqgDlz+iuS3QDafITkJd050L0Hi2kiRBX52pIVso0ZpW1YQsT2VRgtxm9iiqU2qXyZ0OdvZy0J1gFotZFEuGrnt3iiiXvECX+UcWBqpPlgLRkdN7cpl8PxDjWseAu1bPdCjBSrQeVD2RHE7bRhMb1Qd3VHVXVNBewZ3Wm7avbifhB+4LNQrmp0WxiCNkm7dd7mV39SnokrvfzIr+oDSFq1D76MZchw6Vl4Z67CL01I6ZiX/VEqfM1azjaSkKqC+kx67tqTg5ntLii5b96TAA3wMTx2NvqsyyUajYQHJ1qkpmzHQITXDUZRGTYtNw9uLSndMmI9tfMdEeRgwWHB7NlosyivZPlvT5KIOc+GefU9UhA4MmKFXmhAuJRFVWHRJySbREImpQysz4g3uJckihD7P84nWtLo7oR4tr8IKdSBXYvYaZnm3ffhh9nyWPDa+zQfzdULsFlr/khrMb7hhAroOKSZgxbUzqdiVIhQc+iZaTbpesLXSbIfbjwXTf8AjbnV6kTpD4ZsMdXMK45G1NRiMdh/bLb6oXX+4rWHen9BW+xJDV1N+i6HTlKdLDMnVkx8tdHryus3VlCOXXKlDIiuOkimXnmzmrtbGqmAHL1TVXU73PX5nx3xhSO3QKtBqbd31iQHHBNXXrYIXHVyQqDGIcc6qHEcz2ieN+radKS9br/cGzC0G7g0YFQPGdqs7MI6pOt2BgYtt/4MNW8NJ3VT5es/izZZFd9yIfwY1lUubGSSnPiWWzDpAN+sExNptEoBx74q8bAzdFu6NocvC2RgK2WR7doZodiZ6OgoUrBoWIBM2xtMHXUX3GGktr5RtwPZ9tTWfleFP3iEc2hTar6IC1Y55ktYKQtXTsKkfgQ+al0aXBCh2dlCxdBtLtc8QJ4WUKIX+jlRR/TN9pXpNA1bUC7LaYUzJvxr6rh2Q7ellILBd0PcFF5F6uArA6ODZdjQYosZpf7lbu5kNFfbGUUY5C2p7esLhhjw94Miqk+8tDPgTVXX23iliu782KzsaVdexRSq4NORtmY3erV/NFsJU9S7naPXmPGLYvuy5USQA2pcb4z/fYafpPj0t5HEeD1y7W/Z+PHA2t8L1eGCCeFS/Ph04Hafu+Uf8ly2tjUNDQnNUIOqVLrBLIwxK67p3fP7LaX/LjnlniCYv6jNK0ce5YrPud1Gc6LQWg+sumIt2hCCVG3e8e5tsLAL2qWekqp1nKPKqKIJcmxO3oljxVa1TXVDVWmxQ/lhHHnYNP9UDrtFdwekRKCueDRSRAYoo0nEssbG3znTTDahVUXyDj+afeEhn3w/UyY0fSv5b8ZuSmaDVrURYmBrf0ZgIMOGuGFNG3FH45iA7VFzUnj/odcwHzY72OnQEhByP3PtKWxh/Q+/hkl9x5lEic5ojDGgEzcSpnJEwY2y6ZN0RiyMBhZQ35AigLvK/dt9fn9ZJXaHUpf9Y4IxtBSkanMxxP6xb/pC/I1D1icMLDcmjZlj9L61LoIyLxKGRjUcUtOiFju4YqimZ3K0odbd1Usaa7gPp/77IJRuOmxAmqhrWXAPOftoY0P/BsgifTmC2ChOlRSbIMBjjm3bQIeahGwQamM9wHqy19zaTCZr/AtjdNfWMu8SZAAAA13pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHjaPU9LjkMhDNtzijlCyMd5HKflgdRdF72/xmFGJSIEx9ihvd6f2X5qdWizy9WH3+KM7xrRp2iw6hLARIfnSKsqoRKGSEXA0YuZVxOx+QcnMMBKJR2bMdNUDraxWJ2ciQuDDPKgNDA8kakNOwMLriTRO2Alk3okJsUiidC9Ex9HbNUMWJz28uQIzhhNxQduKhdkujHiSJVTCt133eqpJX/6MDXh7nrXydzNq9tssr14NXuwFXaoh/CPiLRfLvxMyj3GtTgAAAGFaUNDUElDQyBwcm9maWxlAAB4nH2RPUjDQBzFX1NFKfUD7CDikKE6WRAVESepYhEslLZCqw4ml35Bk4YkxcVRcC04+LFYdXBx1tXBVRAEP0Dc3JwUXaTE/yWFFjEeHPfj3b3H3TtAqJeZanaMA6pmGclYVMxkV8WuVwjoRQCz6JeYqcdTi2l4jq97+Ph6F+FZ3uf+HD1KzmSATySeY7phEW8QT29aOud94hArSgrxOfGYQRckfuS67PIb54LDAs8MGenkPHGIWCy0sdzGrGioxFPEYUXVKF/IuKxw3uKslquseU/+wmBOW0lxneYwYlhCHAmIkFFFCWVYiNCqkWIiSftRD/+Q40+QSyZXCYwcC6hAheT4wf/gd7dmfnLCTQpGgc4X2/4YAbp2gUbNtr+PbbtxAvifgSut5a/UgZlP0mstLXwE9G0DF9ctTd4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC";
  const img = Buffer.from(imgdata, "base64");

  var favicon = (method, tokens, query, body) => {
    console.log("serving favicon...");
    const headers = {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    };
    let result = img;

    return {
      headers,
      result,
    };
  };

  var require$$0 =
    '<!DOCTYPE html>\r\n<html lang="en">\r\n<head>\r\n    <meta charset="UTF-8">\r\n    <meta http-equiv="X-UA-Compatible" content="IE=edge">\r\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: \'\';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type="module">\nimport { html, render } from \'https://unpkg.com/lit-html@1.3.0?module\';\nimport { until } from \'https://unpkg.com/lit-html@1.3.0/directives/until?module\';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: \'POST\',\r\n            headers: { \'Content-Type\': \'application/json\' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch(\'/\' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get(\'data\');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get(\'data/\' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get(\'util/throttle\');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post(\'util\', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class="collection-list">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href="javascript:void(0)" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set([\'_id\']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from \'//unpkg.com/page/page.mjs\';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector(\'main\');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class="col">Loading&hellip;</div>`;\r\n    let viewer = html`<div class="col">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class="col">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class="layout">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class="layout">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class="col">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>';

  const mode = process.argv[2] == "-dev" ? "dev" : "prod";

  const files = {
    index:
      mode == "prod"
        ? require$$0
        : fs__default["default"].readFileSync("./client/index.html", "utf-8"),
  };

  var admin = (method, tokens, query, body) => {
    const headers = {
      "Content-Type": "text/html",
    };
    let result = "";

    const resource = tokens.join("/");
    if (resource && resource.split(".").pop() == "js") {
      headers["Content-Type"] = "application/javascript";

      files[resource] =
        files[resource] ||
        fs__default["default"].readFileSync("./client/" + resource, "utf-8");
      result = files[resource];
    } else {
      result = files.index;
    }

    return {
      headers,
      result,
    };
  };

  /*
   * This service requires util plugin
   */

  const utilService = new Service_1();

  utilService.post("*", onRequest);
  utilService.get(":service", getStatus);

  function getStatus(context, tokens, query, body) {
    return context.util[context.params.service];
  }

  function onRequest(context, tokens, query, body) {
    Object.entries(body).forEach(([k, v]) => {
      console.log(`${k} ${v ? "enabled" : "disabled"}`);
      context.util[k] = v;
    });
    return "";
  }

  var util$1 = utilService.parseRequest;

  var services = {
    jsonstore,
    users,
    data: data$1,
    favicon,
    admin,
    util: util$1,
  };

  const { uuid: uuid$2 } = util;

  function initPlugin(settings) {
    const storage = createInstance(settings.seedData);
    const protectedStorage = createInstance(settings.protectedData);

    return function decoreateContext(context, request) {
      context.storage = storage;
      context.protectedStorage = protectedStorage;
    };
  }

  /**
   * Create storage instance and populate with seed data
   * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
   */
  function createInstance(seedData = {}) {
    const collections = new Map();

    // Initialize seed data from file
    for (let collectionName in seedData) {
      if (seedData.hasOwnProperty(collectionName)) {
        const collection = new Map();
        for (let recordId in seedData[collectionName]) {
          if (seedData.hasOwnProperty(collectionName)) {
            collection.set(recordId, seedData[collectionName][recordId]);
          }
        }
        collections.set(collectionName, collection);
      }
    }

    // Manipulation

    /**
     * Get entry by ID or list of all entries from collection or list of all collections
     * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
     * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
     * @return {Object} Matching entry.
     */
    function get(collection, id) {
      if (!collection) {
        return [...collections.keys()];
      }
      if (!collections.has(collection)) {
        throw new ReferenceError("Collection does not exist: " + collection);
      }
      const targetCollection = collections.get(collection);
      if (!id) {
        const entries = [...targetCollection.entries()];
        let result = entries.map(([k, v]) => {
          return Object.assign(deepCopy(v), { _id: k });
        });
        return result;
      }
      if (!targetCollection.has(id)) {
        throw new ReferenceError("Entry does not exist: " + id);
      }
      const entry = targetCollection.get(id);
      return Object.assign(deepCopy(entry), { _id: id });
    }

    /**
     * Add new entry to collection. ID will be auto-generated
     * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
     * @param {Object} data Value to store.
     * @return {Object} Original value with resulting ID under _id property.
     */
    function add(collection, data) {
      const record = assignClean({ _ownerId: data._ownerId }, data);

      let targetCollection = collections.get(collection);
      if (!targetCollection) {
        targetCollection = new Map();
        collections.set(collection, targetCollection);
      }
      let id = uuid$2();
      // Make sure new ID does not match existing value
      while (targetCollection.has(id)) {
        id = uuid$2();
      }

      record._createdOn = Date.now();
      targetCollection.set(id, record);
      return Object.assign(deepCopy(record), { _id: id });
    }

    /**
     * Replace entry by ID
     * @param {string} collection Name of collection to access. Throws error if not found.
     * @param {number|string} id ID of entry to update. Throws error if not found.
     * @param {Object} data Value to store. Record will be replaced!
     * @return {Object} Updated entry.
     */
    function set(collection, id, data) {
      if (!collections.has(collection)) {
        throw new ReferenceError("Collection does not exist: " + collection);
      }
      const targetCollection = collections.get(collection);
      if (!targetCollection.has(id)) {
        throw new ReferenceError("Entry does not exist: " + id);
      }

      const existing = targetCollection.get(id);
      const record = assignSystemProps(deepCopy(data), existing);
      record._updatedOn = Date.now();
      targetCollection.set(id, record);
      return Object.assign(deepCopy(record), { _id: id });
    }

    /**
     * Modify entry by ID
     * @param {string} collection Name of collection to access. Throws error if not found.
     * @param {number|string} id ID of entry to update. Throws error if not found.
     * @param {Object} data Value to store. Shallow merge will be performed!
     * @return {Object} Updated entry.
     */
    function merge(collection, id, data) {
      if (!collections.has(collection)) {
        throw new ReferenceError("Collection does not exist: " + collection);
      }
      const targetCollection = collections.get(collection);
      if (!targetCollection.has(id)) {
        throw new ReferenceError("Entry does not exist: " + id);
      }

      const existing = deepCopy(targetCollection.get(id));
      const record = assignClean(existing, data);
      record._updatedOn = Date.now();
      targetCollection.set(id, record);
      return Object.assign(deepCopy(record), { _id: id });
    }

    /**
     * Delete entry by ID
     * @param {string} collection Name of collection to access. Throws error if not found.
     * @param {number|string} id ID of entry to update. Throws error if not found.
     * @return {{_deletedOn: number}} Server time of deletion.
     */
    function del(collection, id) {
      if (!collections.has(collection)) {
        throw new ReferenceError("Collection does not exist: " + collection);
      }
      const targetCollection = collections.get(collection);
      if (!targetCollection.has(id)) {
        throw new ReferenceError("Entry does not exist: " + id);
      }
      targetCollection.delete(id);

      return { _deletedOn: Date.now() };
    }

    /**
     * Search in collection by query object
     * @param {string} collection Name of collection to access. Throws error if not found.
     * @param {Object} query Query object. Format {prop: value}.
     * @return {Object[]} Array of matching entries.
     */
    function query(collection, query) {
      if (!collections.has(collection)) {
        throw new ReferenceError("Collection does not exist: " + collection);
      }
      const targetCollection = collections.get(collection);
      const result = [];
      // Iterate entries of target collection and compare each property with the given query
      for (let [key, entry] of [...targetCollection.entries()]) {
        let match = true;
        for (let prop in entry) {
          if (query.hasOwnProperty(prop)) {
            const targetValue = query[prop];
            // Perform lowercase search, if value is string
            if (
              typeof targetValue === "string" &&
              typeof entry[prop] === "string"
            ) {
              if (
                targetValue.toLocaleLowerCase() !==
                entry[prop].toLocaleLowerCase()
              ) {
                match = false;
                break;
              }
            } else if (targetValue != entry[prop]) {
              match = false;
              break;
            }
          }
        }

        if (match) {
          result.push(Object.assign(deepCopy(entry), { _id: key }));
        }
      }

      return result;
    }

    return { get, add, set, merge, delete: del, query };
  }

  function assignSystemProps(target, entry, ...rest) {
    const whitelist = ["_id", "_createdOn", "_updatedOn", "_ownerId"];
    for (let prop of whitelist) {
      if (entry.hasOwnProperty(prop)) {
        target[prop] = deepCopy(entry[prop]);
      }
    }
    if (rest.length > 0) {
      Object.assign(target, ...rest);
    }

    return target;
  }

  function assignClean(target, entry, ...rest) {
    const blacklist = ["_id", "_createdOn", "_updatedOn", "_ownerId"];
    for (let key in entry) {
      if (blacklist.includes(key) == false) {
        target[key] = deepCopy(entry[key]);
      }
    }
    if (rest.length > 0) {
      Object.assign(target, ...rest);
    }

    return target;
  }

  function deepCopy(value) {
    if (Array.isArray(value)) {
      return value.map(deepCopy);
    } else if (typeof value == "object") {
      return [...Object.entries(value)].reduce(
        (p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }),
        {}
      );
    } else {
      return value;
    }
  }

  var storage = initPlugin;

  const {
    ConflictError: ConflictError$1,
    CredentialError: CredentialError$1,
    RequestError: RequestError$2,
  } = errors;

  function initPlugin$1(settings) {
    const identity = settings.identity;

    return function decorateContext(context, request) {
      context.auth = {
        register,
        login,
        logout,
      };

      const userToken = request.headers["x-authorization"];
      if (userToken !== undefined) {
        let user;
        const session = findSessionByToken(userToken);
        if (session !== undefined) {
          const userData = context.protectedStorage.get(
            "users",
            session.userId
          );
          if (userData !== undefined) {
            console.log("Authorized as " + userData[identity]);
            user = userData;
          }
        }
        if (user !== undefined) {
          context.user = user;
        } else {
          throw new CredentialError$1("Invalid access token");
        }
      }

      function register(body) {
        if (
          body.hasOwnProperty(identity) === false ||
          body.hasOwnProperty("password") === false ||
          body[identity].length == 0 ||
          body.password.length == 0
        ) {
          throw new RequestError$2("Missing fields");
        } else if (
          context.protectedStorage.query("users", {
            [identity]: body[identity],
          }).length !== 0
        ) {
          throw new ConflictError$1(
            `A user with the same ${identity} already exists`
          );
        } else {
          const newUser = Object.assign({}, body, {
            [identity]: body[identity],
            hashedPassword: hash(body.password),
          });
          const result = context.protectedStorage.add("users", newUser);
          delete result.hashedPassword;

          const session = saveSession(result._id);
          result.accessToken = session.accessToken;

          return result;
        }
      }

      function login(body) {
        const targetUser = context.protectedStorage.query("users", {
          [identity]: body[identity],
        });
        if (targetUser.length == 1) {
          if (hash(body.password) === targetUser[0].hashedPassword) {
            const result = targetUser[0];
            delete result.hashedPassword;

            const session = saveSession(result._id);
            result.accessToken = session.accessToken;

            return result;
          } else {
            throw new CredentialError$1("Login or password don't match");
          }
        } else {
          throw new CredentialError$1("Login or password don't match");
        }
      }

      function logout() {
        if (context.user !== undefined) {
          const session = findSessionByUserId(context.user._id);
          if (session !== undefined) {
            context.protectedStorage.delete("sessions", session._id);
          }
        } else {
          throw new CredentialError$1("User session does not exist");
        }
      }

      function saveSession(userId) {
        let session = context.protectedStorage.add("sessions", { userId });
        const accessToken = hash(session._id);
        session = context.protectedStorage.set(
          "sessions",
          session._id,
          Object.assign({ accessToken }, session)
        );
        return session;
      }

      function findSessionByToken(userToken) {
        return context.protectedStorage.query("sessions", {
          accessToken: userToken,
        })[0];
      }

      function findSessionByUserId(userId) {
        return context.protectedStorage.query("sessions", { userId })[0];
      }
    };
  }

  const secret = "This is not a production server";

  function hash(string) {
    const hash = crypto__default["default"].createHmac("sha256", secret);
    hash.update(string);
    return hash.digest("hex");
  }

  var auth = initPlugin$1;

  function initPlugin$2(settings) {
    const util = {
      throttle: false,
    };

    return function decoreateContext(context, request) {
      context.util = util;
    };
  }

  var util$2 = initPlugin$2;

  /*
   * This plugin requires auth and storage plugins
   */

  const {
    RequestError: RequestError$3,
    ConflictError: ConflictError$2,
    CredentialError: CredentialError$2,
    AuthorizationError: AuthorizationError$2,
  } = errors;

  function initPlugin$3(settings) {
    const actions = {
      GET: ".read",
      POST: ".create",
      PUT: ".update",
      PATCH: ".update",
      DELETE: ".delete",
    };
    const rules = Object.assign(
      {
        "*": {
          ".create": ["User"],
          ".update": ["Owner"],
          ".delete": ["Owner"],
        },
      },
      settings.rules
    );

    return function decorateContext(context, request) {
      // special rules (evaluated at run-time)
      const get = (collectionName, id) => {
        return context.storage.get(collectionName, id);
      };
      const isOwner = (user, object) => {
        return user._id == object._ownerId;
      };
      context.rules = {
        get,
        isOwner,
      };
      const isAdmin = request.headers.hasOwnProperty("x-admin");

      context.canAccess = canAccess;

      function canAccess(data, newData) {
        const user = context.user;
        const action = actions[request.method];
        let { rule, propRules } = getRule(
          action,
          context.params.collection,
          data
        );

        if (Array.isArray(rule)) {
          rule = checkRoles(rule, data);
        } else if (typeof rule == "string") {
          rule = !!eval(rule);
        }
        if (!rule && !isAdmin) {
          throw new CredentialError$2();
        }
        propRules.map((r) => applyPropRule(action, r, user, data, newData));
      }

      function applyPropRule(action, [prop, rule], user, data, newData) {
        // NOTE: user needs to be in scope for eval to work on certain rules
        if (typeof rule == "string") {
          rule = !!eval(rule);
        }

        if (rule == false) {
          if (action == ".create" || action == ".update") {
            delete newData[prop];
          } else if (action == ".read") {
            delete data[prop];
          }
        }
      }

      function checkRoles(roles, data, newData) {
        if (roles.includes("Guest")) {
          return true;
        } else if (!context.user && !isAdmin) {
          throw new AuthorizationError$2();
        } else if (roles.includes("User")) {
          return true;
        } else if (context.user && roles.includes("Owner")) {
          return context.user._id == data._ownerId;
        } else {
          return false;
        }
      }
    };

    function getRule(action, collection, data = {}) {
      let currentRule = ruleOrDefault(true, rules["*"][action]);
      let propRules = [];

      // Top-level rules for the collection
      const collectionRules = rules[collection];
      if (collectionRules !== undefined) {
        // Top-level rule for the specific action for the collection
        currentRule = ruleOrDefault(currentRule, collectionRules[action]);

        // Prop rules
        const allPropRules = collectionRules["*"];
        if (allPropRules !== undefined) {
          propRules = ruleOrDefault(
            propRules,
            getPropRule(allPropRules, action)
          );
        }

        // Rules by record id
        const recordRules = collectionRules[data._id];
        if (recordRules !== undefined) {
          currentRule = ruleOrDefault(currentRule, recordRules[action]);
          propRules = ruleOrDefault(
            propRules,
            getPropRule(recordRules, action)
          );
        }
      }

      return {
        rule: currentRule,
        propRules,
      };
    }

    function ruleOrDefault(current, rule) {
      return rule === undefined || rule.length === 0 ? current : rule;
    }

    function getPropRule(record, action) {
      const props = Object.entries(record)
        .filter(([k]) => k[0] != ".")
        .filter(([k, v]) => v.hasOwnProperty(action))
        .map(([k, v]) => [k, v[action]]);

      return props;
    }
  }

  var rules = initPlugin$3;

  var identity = "email";
  var protectedData = {
    users: {
      "35c62d76-8152-4626-8712-eeb96381bea8": {
        email: "peter@abv.bg",
        username: "Peter",
        hashedPassword:
          "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
      },
      "847ec027-f659-4086-8032-5173e2f9c93a": {
        email: "george@abv.bg",
        username: "George",
        hashedPassword:
          "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
      },
      "60f0cf0b-34b0-4abd-9769-8c42f830dffc": {
        email: "admin@abv.bg",
        username: "Admin",
        hashedPassword:
          "fac7060c3e17e6f151f247eacb2cd5ae80b8c36aedb8764e18a41bbdc16aa302",
      },
    },
    sessions: {},
  };
  var seedData = {
    clubs: {
      "3564027f-adcd-4425-b2c0-1253d2386c0a": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0a",
        clubName: "FC Barcelona",
        stadium: "Camp Nou",
        league: "La Liga",
        founded: "29 November 1899",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1024px-FC_Barcelona_%28crest%29.svg.png",
        nickname: "Barça",
        website: "https://www.fcbarcelona.es/es/",
        manager: "Xavi",
        // description:
        // "The history of Futbol Club Barcelona begins from the football club's founding in 1899 up until the present day. FC Barcelona, also known simply as Barcelona and familiarly as Barça, is based in Barcelona, Catalonia, Spain. The club was founded in 1899 by a group of Swiss, Catalan, German, and English footballers led by Joan Gamper. The club played amateur football until 1910 in various regional competitions. In 1910, the club participated in their first of many European competitions, and has since amassed fourteen UEFA trophies and a sextuple. In 1928, Barcelona co-founded La Liga, the top-tier in Spanish football, along with a string of other clubs. As of 2023, Barcelona has never been relegated from La Liga, a record they share with Athletic Bilbao and arch-rival Real Madrid.The history of Barcelona has often been political. Though it was a club created and run by foreigners, Barcelona gradually became a club associated with Catalan values. In Spain's transition to autocracy in 1925, Catalonia became increasingly hostile towards the central government in Madrid. The hostility enhanced Barcelona's image as a focal point for Catalonism, and when Francisco Franco banned the use of the Catalan language, the stadium of Barcelona became one of the few places the people could express their dissatisfaction. The Spanish transition to democracy in 1978 has not dampened the club's image of Catalan pride. In the 2000s and 2010s – a period of sporting success in the club and an increased focus on Catalan players – club officials have been openly faithful to historic club commitment to the defense of the country, democracy, freedom of expression and the right to decide, and have condemns any action that may impede the full exercise of these rights.",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0b": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0b",
        clubName: "Real Madrid CF",
        stadium: "Santiago Bernabéu",
        league: "La Liga",
        founded: "6 March 1902",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/800px-Real_Madrid_CF.svg.png",
        nickname: "Los Blancos",
        website: "https://www.realmadrid.com/es-ES",
        manager: "Carlo Ancelotti",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0c": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0c",
        clubName: "Manchester United F.C.",
        stadium: "Old Trafford",
        league: "Premier League",
        founded: "24 April 1902",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/1024px-Manchester_United_FC_crest.svg.png",
        nickname: "The Red Devils",
        website: "https://www.manutd.com/",
        manager: "Erik ten Hag",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0d": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0d",
        clubName: "Chelsea F.C.",
        stadium: "Stamford Bridge",
        league: "Premier League",
        founded: "10 March 1905",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/1024px-Chelsea_FC.svg.png",
        nickname: "The Blues",
        website: "https://www.chelseafc.com/en",
        manager: "Mauricio Pochettino",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0e": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0e",
        clubName: "Inter Milan",
        stadium: "Juventus Stadium",
        league: "Serie A",
        founded: "9 March 1908",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/285px-FC_Internazionale_Milano_2021.svg.png",
        nickname: "Nerazzurri",
        website: "https://www.inter.it/it",
        manager: "Simone Inzaghi",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0f": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0f",
        clubName: "Paris Saint-Germain F.C.",
        stadium: "Parc des Princes",
        league: "Ligue 1",
        founded: "12 August 1970",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/1024px-Paris_Saint-Germain_F.C..svg.png",
        nickname: "The Parisians",
        website: "https://www.psg.fr/",
        manager: "Luis Enrique",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0g": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0g",
        clubName: "FC Bayern Munich",
        stadium: "Allianz Arena",
        league: "Bundesliga",
        founded: "27 February 1900",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/285px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png",
        nickname: "The Bavarians",
        website: "https://fcbayern.com/en",
        manager: "Thomas Tuchel",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0h": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0h",
        clubName: "Arsenal F.C.",
        stadium: "Emirates Stadium",
        league: "Premier League",
        founded: "October 1886",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/800px-Arsenal_FC.svg.png",
        nickname: "The Gunners",
        website: "https://www.arsenal.com/",
        manager: "Mikel Arteta",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0i": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0i",
        clubName: "Liverpool F.C.",
        stadium: "Anfield",
        league: "Premier League",
        founded: "3 June 1892",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/800px-Liverpool_FC.svg.png",
        nickname: "The Reds",
        website: "https://www.liverpoolfc.com/",
        manager: "Jürgen Klopp",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0j": {
        _id: "3564027f-adcd-4425-b2c0-1253d2386c0j",
        clubName: "Manchester City F.C.",
        stadium: "City of Manchester Stadium",
        league: "Premier League",
        founded: "July 1894",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/1024px-Manchester_City_FC_badge.svg.png",
        nickname: "The Citizens ",
        website: "https://www.mancity.com/",
        manager: "Pep Guardiola",
      },
    },
    clubDetails: {
      "3564027f-adcd-4425-b2c0-1253d2386c0a": {
        clubName: "FC Barcelona",
        introduction:
          "Founded on November 29, 1899, by Joan Gamper, FC Barcelona quickly became a symbol of Catalonia's identity. The club's motto, 'Més que un club' (More than a club), reflects its commitment to values beyond the pitch. From its early days, Barcelona has embodied a distinct footballing philosophy that prioritizes attacking play and flair.",
        competition:
          "FC Barcelona's dominance in La Liga is integral to its history. With 26 domestic league titles as of my last knowledge update in 2022, the club has consistently been at the forefront of Spanish football. Iconic players like Kubala, Cruyff, and more recently, Messi, have left an indelible mark on Barcelona's journey to becoming a La Liga powerhouse.",
        triumphs:
          "Barcelona's ascent to European glory began with the 1992 European Cup triumph at Wembley, marking the start of a new era. The club went on to secure multiple UEFA Champions League titles, with the peak being the historic treble in the 2008-2009 season under Pep Guardiola.",
        stadium:
          "Camp Nou, inaugurated in 1957, has witnessed the club's greatest triumphs. The stadium, with a seating capacity of over 99,000, stands not only as Europe's largest stadium but also as a testament to the unwavering passion of Barcelona's supporters. Historic moments, including European victories and legendary goals, echo through the stands.",

        legendaryPlayers:
          "The annals of FC Barcelona are adorned with iconic figures. From the prolific Laszlo Kubala to Johan Cruyff's 'Dream Team' era and the more recent era dominated by Lionel Messi, Xavi Hernandez, and Andres Iniesta, each generation has added to the club's unique playing style. The emphasis on 'tiki-taka' and attacking prowess has become synonymous with Barcelona's identity.",

        challenges:
          "FC Barcelona, like any institution, faced challenges. The club navigated financial difficulties in the early 2000s, yet emerged stronger. The departure of key players and transitions in management tested the club's resilience. However, the commitment to La Masia's youth development and a steadfast focus on its footballing philosophy allowed Barcelona to weather storms and maintain a competitive edge.",

        conclusion:
          "In conclusion, FC Barcelona's history is a tapestry woven with triumphs, iconic players, and a commitment to values that extend beyond football. The club's legacy is not merely in trophies but in the indomitable spirit that resonates globally. FC Barcelona remains a symbol of excellence, identity, and the beautiful game. ¡Visca el Barça!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0b": {
        clubName: "Real Madrid",
        introduction:
          "Established in 1902, Real Madrid stands as a global footballing powerhouse, embodying a rich history of success and a legacy that extends beyond the sport. This introduction sets the stage for an exploration of Real Madrid's unique identity and its profound impact on the world of football.",
        competition:
          "Real Madrid's dominance in La Liga is integral to its history. With numerous domestic league titles, the club has consistently been a force in Spanish football. Iconic players like Di Stéfano, Puskás, and more recently, Ronaldo, have left an indelible mark on Real Madrid's journey to becoming a La Liga giant.",
        triumphs:
          "Real Madrid's relationship with the UEFA Champions League is legendary. This chapter chronicles the club's storied history in the competition, featuring iconic victories, heartbreaking defeats, and the indelible mark left by players such as Cristiano Ronaldo and Sergio Ramos.",
        stadium:
          "The Santiago Bernabéu Stadium has been the epicenter of Real Madrid's glory. This chapter provides an in-depth look at the historic stadium, its architecture, and the unforgettable moments that have unfolded within its walls.",
        legendaryPlayers:
          "Real Madrid has been graced by some of the greatest footballing talents in history. Highlighting players like Alfredo Di Stéfano, Raúl, and Cristiano Ronaldo, this chapter celebrates the contributions of those who have become synonymous with the club's success.",
        challenges:
          "Real Madrid, like any other institution, has faced challenges. This section discusses periods of adversity, financial struggles, and the resilience demonstrated by the club in overcoming obstacles to maintain its elite status.",
        conclusion:
          "In conclusion, Real Madrid's journey through time is a testament to its enduring legacy. The club's consistent pursuit of excellence, commitment to attacking football, and ability to evolve with the times have solidified its place as a true footballing giant. As we reflect on the past, we anticipate a future filled with continued success and a lasting impact on the beautiful game. Hala Madrid!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0c": {
        clubName: "Manchester United",
        introduction:
          "Founded in 1878 as Newton Heath LYR Football Club, Manchester United has evolved into one of the most successful and iconic football clubs globally. This introduction sets the stage for an exploration of Manchester United's rich history, defining moments, and its enduring impact on the world of football.",
        competition:
          "Manchester United's dominance in the Premier League is integral to its history. With numerous domestic league titles, the club has been a powerhouse in English football. Iconic managers like Sir Matt Busby and Sir Alex Ferguson, along with legendary players, have contributed to Manchester United's status as a Premier League giant.",
        triumphs:
          "Manchester United's journey in European competitions has been filled with triumphs and iconic moments. This chapter explores the club's history in the UEFA Champions League, highlighting memorable victories, the famous Treble-winning season in 1998-1999, and the players who became legends under the floodlights.",
        stadium:
          "Old Trafford, the historic home of Manchester United, is more than a stadium; it's a symbol of the club's heritage. This chapter provides insight into the stadium's rich history, its iconic architecture, and the unforgettable moments that have unfolded within its hallowed grounds.",
        legendaryPlayers:
          "Manchester United has been home to footballing legends and a distinct playing style. From the Busby Babes to the Class of '92 and beyond, this chapter celebrates the contributions of players who have defined Manchester United's identity and the attacking football that fans adore.",
        challenges:
          "Manchester United, like any institution, has faced challenges. This section discusses periods of transition, managerial changes, and the resilience shown by the club. It also explores how Manchester United navigated challenges and underwent revival, striving to maintain its standing among football's elite.",
        conclusion:
          "In conclusion, Manchester United's journey is a captivating narrative of success, iconic players, and a commitment to attacking football. The club's legacy extends beyond trophies, embodying the spirit of resilience and determination. As Manchester United looks to the future, the Red Devils continue to be a symbol of passion, tradition, and excellence in the beautiful game.",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0d": {
        clubName: "Chelsea FC",
        introduction:
          "Founded in 1905, Chelsea FC has grown from its early beginnings to become a prominent force in English and European football. This introduction sets the stage for an exploration of Chelsea's intriguing history, its rise to prominence, and its impact on the footballing world.",
        competition:
          "Chelsea's ascent to Premier League prominence is a defining chapter in its history. With multiple domestic league titles, the club has become a formidable presence in English football. Iconic managers, including Jose Mourinho and Carlo Ancelotti, have guided Chelsea to success on the domestic front.",
        triumphs:
          "Chelsea's European journey has been marked by triumphs and unforgettable moments. This chapter delves into the club's successes in European competitions, including the historic UEFA Champions League victories, showcasing the players and managers who played pivotal roles in these achievements.",
        stadium:
          "Stamford Bridge, Chelsea's iconic home ground, holds a special place in the club's history. This chapter explores the stadium's evolution, its unique atmosphere, and the memorable events that have unfolded within its confines.",
        legendaryPlayers:
          "Chelsea has been graced by footballing legends who have left an indelible mark on the club's history. This chapter celebrates the contributions of iconic players and managers, highlighting Chelsea's evolving style of play and the tactics that have defined different eras.",
        challenges:
          "Chelsea, like any club, has faced challenges along its journey. This section discusses periods of transition, financial challenges, and the resilience displayed by the club. It explores how Chelsea overcame obstacles, embraced new eras, and experienced resurgence on both domestic and European fronts.",
        conclusion:
          "In conclusion, Chelsea FC's history is a vibrant narrative of triumphs, legendary figures, and a commitment to excellence. The club's legacy extends far beyond the pitch, embodying the spirit of resilience and adaptability. As Chelsea looks ahead, the Blues continue to be a symbol of ambition, innovation, and success in the ever-evolving world of football.",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0e": {
        clubName: "Inter Milan",
        introduction:
          "Founded in 1908, Inter Milan stands as one of the most storied football clubs, renowned for its distinctive black and blue colors and a legacy deeply rooted in Italian football. This introduction sets the stage for an exploration of Inter Milan's unique identity and its impact on the footballing world.",
        competition:
          "Inter Milan's consistent success in Serie A is a cornerstone of its history. With numerous domestic league titles, the club has been a dominant force in Italian football. Legendary players and managers have played crucial roles in Inter Milan's enduring presence at the top of Serie A.",
        triumphs:
          "Inter Milan's journey in European competitions has been highlighted by memorable triumphs. This chapter explores the club's iconic treble-winning season in 2009-2010, showcasing key victories and the players who etched their names into Inter Milan's history on the continental stage.",
        stadium:
          "San Siro, Inter Milan's iconic home stadium, has witnessed the club's greatest moments. This chapter provides an in-depth look at the history, architecture, and unique atmosphere of San Siro, a place where the passion of Inter Milan's supporters converges with the brilliance of its players.",
        legendaryPlayers:
          "Inter Milan boasts a rich history of legendary players who have defined the club's identity. This chapter celebrates the contributions of iconic figures, exploring Inter Milan's evolving playing style and the tactical innovations that have characterized different eras.",
        challenges:
          "Inter Milan, like any football institution, has faced challenges. This section delves into periods of adversity, financial struggles, and the resilience displayed by the club. It examines how Inter Milan navigated challenges, underwent a renaissance, and positioned itself as a formidable force in Italian and European football.",
        conclusion:
          "In conclusion, Inter Milan's journey is a testament to its legacy of success, unique identity, and unwavering passion. The club remains not just a football institution but a symbol of excellence, tradition, and the beautiful game. As Inter Milan looks forward, the Nerazzurri continue to inspire with their commitment to greatness. Forza Inter!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0f": {
        clubName: "Paris Saint-Germain",
        introduction:
          "Founded in 1970, Paris Saint-Germain (PSG) has become synonymous with flair, style, and success in French and European football. This introduction sets the stage for an exploration of PSG's unique journey, from its early days to its current status as a footballing powerhouse.",
        competition:
          "PSG's dominance in Ligue 1 is a defining aspect of its history. With multiple domestic league titles, the club has consistently been a force in French football. Iconic players and managers have contributed to PSG's rise to the summit of Ligue 1.",
        triumphs:
          "PSG's aspirations on the European stage have grown exponentially. This chapter explores the club's endeavors in European competitions, including memorable victories, star-studded line-ups, and the pursuit of UEFA Champions League glory.",
        stadium:
          "Parc des Princes, PSG's historic home stadium, holds a special place in the hearts of fans. This chapter provides insights into the stadium's rich history, its role in PSG's journey, and the passionate atmosphere that reverberates during matches.",
        legendaryPlayers:
          "PSG has become a destination for footballing superstars, known for assembling a team of Galácticos. This chapter celebrates the contributions of iconic players, exploring PSG's evolving playing style and the blend of individual brilliance that defines the club's identity.",
        challenges:
          "PSG, like any ambitious club, has faced challenges on its path to success. This section delves into periods of transition, financial endeavors, and the club's global ambitions. It examines how PSG has navigated challenges while maintaining a commitment to excellence.",
        conclusion:
          "In conclusion, PSG's journey is a captivating narrative of triumphs, global ambitions, and a commitment to entertainment. The club's legacy extends far beyond France, embodying the spirit of flair and elegance. As PSG looks ahead, the Parisians continue to elevate their status on the footballing stage. Allez Paris!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0g": {
        clubName: "FC Bayern Munich",
        introduction:
          "Founded in 1900, FC Bayern Munich has established itself as a powerhouse in German and European football. This introduction sets the stage for an exploration of Bayern Munich's rich history, dominance in domestic competitions, and its impact on the international footballing scene.",
        competition:
          "Bayern Munich's dominance in the Bundesliga is a hallmark of its history. With numerous domestic league titles, the club has consistently set the standard in German football. Iconic players and managers have played key roles in Bayern's sustained success in the Bundesliga.",
        triumphs:
          "Bayern Munich's journey in European competitions has been marked by triumphs and memorable moments. This chapter explores the club's successes in the UEFA Champions League, including historic victories, star-studded teams, and its place among Europe's elite.",
        stadium:
          "Allianz Arena, Bayern Munich's modern home, stands as a symbol of the club's contemporary success. This chapter provides insights into the stadium's architecture, the electric atmosphere during matches, and the unforgettable events that have unfolded within its walls.",
        legendaryPlayers:
          "Bayern Munich boasts a legacy of footballing legends who have left an indelible mark on the club. This chapter celebrates the contributions of iconic figures, exploring Bayern's distinctive playing style and the strategic philosophies that have defined different eras.",
        challenges:
          "FC Bayern Munich, like any ambitious club, has faced challenges on its path to excellence. This section delves into periods of transition, managerial changes, and the club's resilience in the face of adversity. It examines how Bayern has maintained a commitment to excellence while overcoming challenges.",
        conclusion:
          "In conclusion, FC Bayern Munich's history is a tapestry of success, legendary players, and a commitment to perfection. The club remains a benchmark for excellence in German and European football. As Bayern looks ahead, the red giants continue to inspire with their relentless pursuit of greatness. Mia san mia!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0h": {
        clubName: "Arsenal FC",
        introduction:
          "Founded in 1886, Arsenal FC has a storied history that spans over a century, marked by successes, iconic moments, and a commitment to attractive football. This introduction sets the stage for an exploration of Arsenal's unique journey, from its early days to its current status as a prominent football club.",
        competition:
          "Arsenal's success in the First Division and the Premier League is integral to its history. With multiple league titles, the club has consistently been a major player in English football. Iconic managers and players have left an indelible mark on Arsenal's journey to the pinnacle of English football.",
        triumphs:
          "Arsenal's endeavors in European competitions have been filled with drama and memorable moments. This chapter explores the club's journey in UEFA competitions, including historic victories, tough defeats, and the players who have graced the European stage wearing the iconic red and white.",
        stadium:
          "Highbury, the historic former home, and the modern Emirates Stadium have played crucial roles in Arsenal's history. This chapter provides insights into the unique atmospheres of both stadiums and their significance in the club's identity and fan culture.",
        legendaryPlayers:
          "Arsenal's Invincibles of the 2003-2004 season and the club's distinctive playing style are celebrated in this chapter. From the free-flowing football to iconic moments, this section delves into the elements that define Arsenal's footballing identity.",
        challenges:
          "Arsenal, like any football club, has faced challenges. This section explores periods of transition, managerial changes, and the club's resilience in the face of adversity. It examines how Arsenal has navigated challenges and embarked on a journey of rebuilding for sustained success.",
        conclusion:
          "In conclusion, Arsenal FC's history is a tapestry of triumphs, unforgettable moments, and a commitment to attacking football. The club remains a symbol of pride for its fans and the footballing world. As Arsenal looks ahead, the Gunners continue to strive for success and glory. Up the Arsenal!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0i": {
        clubName: "Liverpool FC",
        introduction:
          "Founded in 1892, Liverpool FC has a rich history filled with success, iconic moments, and a passionate fanbase. This introduction sets the stage for an exploration of Liverpool's unique journey, from its early days to its current standing as a footballing institution.",
        competition:
          "Liverpool's success in the First Division and the Premier League is a cornerstone of its history. With numerous league titles, the club has consistently been at the forefront of English football. Iconic managers and players have left an indelible mark on Liverpool's journey to domestic supremacy.",
        triumphs:
          "Liverpool's European adventures are legendary. This chapter delves into the club's triumphs in UEFA competitions, including memorable victories, iconic comebacks, and the players who have become synonymous with European glory while wearing the famous red jersey.",
        stadium:
          "Anfield, Liverpool's historic home, is more than a stadium; it's a fortress that pulsates with the heartbeat of the club. This chapter explores the unique atmosphere, the famous Kop stand, and the historic moments that have unfolded within Anfield's hallowed grounds.",
        legendaryPlayers:
          "Liverpool boasts a legacy of footballing legends who have embodied the 'Liverpool Way.' This chapter celebrates the contributions of iconic figures, exploring Liverpool's distinctive playing style, values, and the culture that defines the club.",
        challenges:
          "Liverpool, like any club, has faced challenges. This section explores periods of transition, financial difficulties, and the resilience displayed by the club. It delves into the Jurgen Klopp era, highlighting the transformative impact of the manager and the team's pursuit of excellence.",
        conclusion:
          "In conclusion, Liverpool FC's history is a mosaic of triumphs, resilience, and a commitment to the famous anthem, 'You'll Never Walk Alone.' The club remains a symbol of unity, passion, and footballing excellence. As Liverpool looks ahead, the Reds continue to inspire with their pursuit of glory. You'll Never Walk Alone!",
      },
      "3564027f-adcd-4425-b2c0-1253d2386c0j": {
        clubName: "Manchester City",
        introduction:
          "Founded in 1880, Manchester City has undergone a transformative journey from its early days to becoming a modern footballing force. This introduction sets the stage for an exploration of Manchester City's unique history, marked by revival, triumphs, and a commitment to excellence.",
        competition:
          "Manchester City's ascent to the summit of the Premier League is central to its history. With recent domestic league dominance, the club has firmly established itself as a major player in English football. Iconic managers and players have contributed to Manchester City's rise to prominence.",
        triumphs:
          "Manchester City's pursuit of success in European competitions is a defining chapter. This section explores the club's journey in UEFA competitions, including historic victories, memorable moments, and the challenges faced on the continental stage.",
        stadium:
          "Etihad Stadium, Manchester City's home, is a symbol of the club's modern era. This chapter provides insights into the stadium's significance, the vibrant atmosphere during matches, and the historic events that have unfolded within its walls.",
        legendaryPlayers:
          "Manchester City has been graced by footballing icons and a distinctive playing style. This chapter celebrates the contributions of legendary figures, exploring Manchester City's evolving playing philosophy and the tactics that have defined different eras.",
        challenges:
          "Manchester City, like any ambitious club, has faced challenges. This section discusses periods of transition, financial evolution, and the resilience displayed by the club. It examines how Manchester City has overcome challenges and continuously strived for improvement.",
        conclusion:
          "In conclusion, Manchester City's history is a narrative of triumphs, innovation, and a commitment to excellence. The club stands as a symbol of Cityzens' pride and the pursuit of footballing greatness. As Manchester City looks ahead, the sky-blue revolution continues to inspire with its dedication to success. Come on, City!",
      },
    },
    players: {
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed01": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed01",
        name: "Lionel Messi",
        born: "June 24, 1987",
        birthPlace: "Rosario, Santa Fe, Argentina",
        nationality: "Argentinian",
        height: "1.70 m",
        positions: "Forward",
        goals: "802",
        trophies: "42",
        status: "active",
        readMore:
          "Emerging from Barcelona's academy La Masia, Lionel Messi quickly became one of the best players in football, winning his first Ballon d’Or in 2009 at the age of 22. He went on to win seven of them. He won the coveted treble twice with Barcelona and finally ended his wait for a major international trophy with the Copa America 2021 and then added the FIFA World Cup 2022 trophy to his haul, which also includes an Olympic gold medal from Beijing 2008. He is also the only player in history to win two Golden Balls in World Cups (2014 and 2022). Now in the twilight of his career, the Argentinian legend is now playing in the United States with Inter Miami. In his short time in Miami, he has made an impact by helping the franchise win the Leagues Cup which is the first ever in the history of the franchise.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/330px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed02": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed02",
        name: "Cristiano Ronaldo",
        born: "5 February 1985",
        birthPlace: "Funchal, Madeira, Portugal",
        nationality: "Portuguese",
        height: "1.87 m",
        positions: "Forward",
        goals: "819",
        trophies: "34",
        status: "active",
        readMore:
          "Cristiano Ronaldo is the greatest goal-scorer in football history and won league titles in three different countries - England, Spain and Italy, over the course of his career. He also won five Champions League titles, four of which came during his iconic spell at Real Madrid. The five-time Ballon d'Or winner also scored four goals en route to Portugal's first-ever major trophy, the UEFA Euro 2012.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg/330px-Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed03": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed03",
        name: "Pelé",
        born: "23 October 1940",
        birthPlace: "Três Corações, Brazil",
        nationality: "Brazilian",
        height: "1.73 m",
        positions: "Forward",
        goals: "767",
        trophies: "26",
        status: "inactive",
        readMore:
          "Three-time World Cup-winner Pele announced his arrival on the global stage with six goals in the 1958 World Cup. Renowned among modern day fans as the first superstar of football, the “Black Pearl” went on to score over 700 goals for club and country, also winning multiple titles with Brazilian club Santos.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pele_con_brasil_%28cropped%29.jpg/330px-Pele_con_brasil_%28cropped%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed04": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed04",
        name: "Diego Maradon",
        born: "30 October 1960",
        birthPlace: "Lanús, Argentina",
        nationality: "Argentinian",
        height: "1.65 m",
        positions: "Forward",
        goals: "353",
        trophies: "12",
        status: "inactive",
        readMore:
          "Widely rated by multiple fans and experts as one of the greatest attacking players in football, Diego Maradona inspired a generation of footballers with his ball control and trickery. He won the 1986 FIFA World Cup with Argentina, scoring two goals each in the quarter-finals and semi-finals of the tournament. He also drove Napoli to the only two league titles they won in their history.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Maradona-Mundial_86_con_la_copa.JPG/330px-Maradona-Mundial_86_con_la_copa.JPG",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed05": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed05",
        name: "Johan Cruyff",
        born: "25 April 1947",
        birthPlace: "Amsterdam, Netherlands",
        nationality: "Netherlander",
        height: "1.78 m",
        positions: "Forward",
        goals: "433",
        trophies: "22",
        status: "inactive",
        readMore:
          "Touted as the pioneer of “Total football”, Johan Cruyff is considered the most influential personality in football history for his contributions as player and manager. Johan Cruyff won three consecutive European Cup titles (currently Champions League) with Ajax, also winning the Ballon d’Or three times. With the Netherlands, he reached the FIFA World Cup finals two times in a row in 1974 and 1978.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Johan_Cruijff_%281974%29.jpg/375px-Johan_Cruijff_%281974%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed06": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed06",
        name: "Zinedine Zidane",
        born: "23 June 1972",
        birthPlace: "Marseille, France",
        nationality: "Netherlander",
        height: "1.85 m",
        positions: "Midfielder",
        goals: "156",
        trophies: "15",
        status: "inactive",
        readMore:
          "Zinedine Zidane is one of the greatest football players ever. He was an embodiment of control and technique. He started as a youngster in Cannes but he was spotted by Bordeaux who signed him. Later on, he was snapped up by Juventus where he won multiple titles before moving to Real Madrid where he won the Champions League in his first season. He also helped France win the 1998 FIFA World Cup on home soil and got to the finals again in 2006 where they lost to Italy. He was named the best player in the World in 1998, 2000, and 2003.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Zinedine_Zidane_by_Tasnim_03.jpg/330px-Zinedine_Zidane_by_Tasnim_03.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed07": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed07",
        name: "Gerd Muller",
        born: "3 November 1945",
        birthPlace: "Nördlingen, Germany",
        nationality: "German",
        height: "1.76 m",
        positions: "Striker",
        goals: "718",
        trophies: "16",
        status: "inactive",
        readMore:
          "Gerd Muller is a German football legend and one of the greatest footballing exports from the European country. He played for a couple of German clubs including Bayern Munich where he made his name. He made 453 appearances in the colours of Bayern Munich with a goals record of 398. Later on in his career, he moved to the United States where he played for Fort Lauderdale Strikers. On the International scene, he won the European championship with Germany in 1972 and the FIFA World Cup two years later.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Gerd_Muller_1978.JPG/330px-Gerd_Muller_1978.JPG",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed08": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed08",
        name: "Ronaldo Nazario",
        born: "18 September 1976",
        birthPlace: "Itaguaí, Brazil",
        nationality: "Brazilian",
        height: "1.83 m",
        positions: "Striker",
        goals: "414",
        trophies: "19",
        status: "inactive",
        readMore:
          "Ronaldo was a prodigy who blossomed early in his career. Even years after a career blighted by injury, the Brazilian is still widely regarded as one of the best strikers ever. He began his career at Cruzeiro where he notified the Brazilian public of his goal-scoring instincts, bagging 12 goals in 14 matches. Ronaldo at 17 made the USA 1994 World Cup winning squad, but he was limited to a bit part role. He soon moved to PSV where banged in 30 goals in his first season in European football. His consistency soon earned him a move to Barcelona where he continued his scoring streak. In 1998 he and Brazil lost the World Cup final to France, but won it four years later in Korea/Japan 2002. He won the Ballon d'Or twice in his career with a host of major trophies. He scored a total of 414 goals for club and country.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/051119SMcC0014.jpg/330px-051119SMcC0014.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed09": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed09",
        name: "Alfredo di Stefano",
        born: "4 July 1926",
        birthPlace: "Buenos Aires, Argentina",
        nationality: "Brazilian",
        height: "1.78 m",
        positions: "Forward, Midfielder",
        goals: "509",
        trophies: "27",
        status: "inactive",
        readMore:
          "Real Madrid and Argentina legend Alfredo Di Stefano is widely regarded as one of the most complete players to grace the beautiful game. Born in Buenos Aires, he started his career with River Plate. At first, he struggled to get into the first team and was subsequently sent on loan to Atletico Huracan. On returning from the loan spell, he became an integral part of the River Plate team thus helping them to the title in 1947. He had a stint with Millionariis before he sojourned to Spain to join Real Madrid. It was Real Madrid he made his name and became famous worldwide. He helped the Spanish giants win eight La Liga titles between 1954 and 1964, and another five consecutive European titles between 1955 and 1960.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Di_stefano_argentina_%28cropped%29.jpg/330px-Di_stefano_argentina_%28cropped%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed10": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed10",
        name: "Michel Platini",
        born: "21 June 1955",
        birthPlace: "Jœuf, France",
        nationality: "Frenchman",
        height: "1.79 m",
        positions: "Midfielder",
        goals: "353",
        trophies: "12",
        status: "inactive",
        readMore:
          "The history of French football cannot be complete without that of Michel Platini being told. He was an excellent midfielder during his playing career. He was born in 1955 to Italian parents in the North-East of France. He started his youth career with Nancy and later became a professional with the club winning the 1978 French Cup. He teamed up with Saint Etienne later and he helped them win the Ligue 1 title in 1981. A year after winning the title in France he moved to Juventus where he won a number of titles.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/6/66/Michel_Platini_2010_%28cropped%29.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed11": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed11",
        name: "Paolo Maldini",
        born: "26 June 1968",
        birthPlace: "Milan, Italy",
        nationality: "Italian",
        height: "1.86 m",
        positions: "Defender",
        goals: "40",
        trophies: "8",
        status: "inactive",
        readMore:
          "Paolo Maldini, born on June 26, 1968, in Milan, Italy, is a football legend known for his entire playing career at AC Milan. Debuting in 1985, he became a stalwart defender, captaining both Milan and Italy. Maldini won numerous Serie A titles and UEFA Champions League trophies, contributing to AC Milan's dominance in the late 1980s and 1990s. Renowned for his defensive prowess and versatility, he retired in 2009 after over two decades with the club. Maldini's legacy embodies loyalty, leadership, and excellence in football.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Paolo_Maldini_AC_Milan_Technical_director_2018.jpg/330px-Paolo_Maldini_AC_Milan_Technical_director_2018.jpg",
      },
      "9be3ac7d-2c6e-4d74-b187-04105ab7ed12": {
        _id: "9be3ac7d-2c6e-4d74-b187-04105ab7ed12",
        name: "Hristo Stoichkov",
        born: "8 February 1966",
        birthPlace: "Plovdiv, Bulgaria",
        nationality: "Bulgarian",
        height: "1.78 m",
        positions: "Forward",
        goals: "250",
        trophies: "10",
        status: "inactive",
        readMore:
          "Hristo Stoichkov, born on February 8, 1966, in Plovdiv, Bulgaria, is a football icon celebrated for his skill, flair, and goal-scoring prowess. Emerging in the late 1980s, he gained prominence with CSKA Sofia before moving to Barcelona in 1990. Stoichkov played a pivotal role in Barcelona's success, winning four consecutive La Liga titles and the UEFA Champions League in 1992. His individual achievements include the Ballon d'Or in 1994. Stoichkov's fiery personality on the pitch matched his playing style, making him a fan favorite. Known for his lethal left foot and dynamic attacking play, he was a key figure in Bulgaria's surprising run to the 1994 FIFA World Cup semifinals, earning him the Golden Boot as the tournament's top scorer. After successful stints in various European clubs, Stoichkov retired in 2003. Post-retirement, he ventured into coaching and punditry, leaving an enduring legacy as one of Bulgaria's greatest football exports and a symbol of skill and passion on the field.",

        imgUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Stoichkov_in_2016.jpg/330px-Stoichkov_in_2016.jpg",
      },
    },
  };
  var rules$1 = {
    users: {
      ".create": false,
      ".read": ["Owner"],
      ".update": false,
      ".delete": false,
    },
    members: {
      ".update": "isOwner(user, get('teams', data.teamId))",
      ".delete":
        "isOwner(user, get('teams', data.teamId)) || isOwner(user, data)",
      "*": {
        teamId: {
          ".update": "newData.teamId = data.teamId",
        },
        status: {
          ".create": "newData.status = 'pending'",
        },
      },
    },
  };
  var settings = {
    identity: identity,
    protectedData: protectedData,
    seedData: seedData,
    rules: rules$1,
  };

  const plugins = [
    storage(settings),
    auth(settings),
    util$2(),
    rules(settings),
  ];

  const server = http__default["default"].createServer(
    requestHandler(plugins, services)
  );

  const port = 3030;
  server.listen(port);
  console.log(
    `Server started on port ${port}. You can make requests to http://localhost:${port}/`
  );
  console.log(`Admin panel located at http://localhost:${port}/admin`);

  var softuniPracticeServer = {};

  return softuniPracticeServer;
});
