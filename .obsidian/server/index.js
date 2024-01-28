const { server, Config, Router, Table } = require("../../modules");
const path = require("path");
const config = new Config();
const port = config.get("port");
let options = {};
const cert_options = config.get("secure_certs");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

options = {
  not_found: path.join(__dirname, "./resources/404.html"),
};
if (cert_options.enabled) {
  options = {
    not_found: path.join(__dirname, "./resources/404.html"),
    cert: path.join(__dirname, cert_options.cert_path),
    key: path.join(__dirname, cert_options.key_path),
  };
}
const app = server(options);

const fs = require("fs");
const { Database } = require("../workers/database");
const defaultPath = process.cwd();
const pagesPath = path.join(defaultPath, "pages");
const routesPath = path.join(defaultPath, "routes");
const tablesPath = path.join(defaultPath, "models");
const { spawn } = require("child_process");
const ObsidianError = require("../classes/ObsidianError");
const requestCount = new Map();
let portdb = null;
let url = null;
let remote = false;

let db_options = {};
if (config.get("database")) {
  db_options = config.get("database");
}

if (config.get("onstart")) {
  let spawna = config.get("onstart").spawn;
  if (Array.isArray(spawna)) {
    for (const item of spawna) {
      spawn_child(item);
    }
  }
}

function spawn_child(cmd) {
  const args = ["node"];
  if (cmd.includes(" ")) {
    args.push(...cmd.split(" "));
  }
  args.push(cmd);
  const child = spawn(args[0], args.slice(1));
  child.stdout.on("data", (data) => {
    console.log(` ${data}`);
  });
  child.stderr.on("data", (data) => {
    console.log(` ${data}`);
  });
  child.on("error", (error) => {
    console.log(` ${error.message}`);
  });
  child.on("exit", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

const database = new Database(db_options);

const rate_config = config.get("rate_limits");

if (rate_config.enabled) {
  if (!rate_config.duration) {
    rate_config.duration = 60;
  }
  if (!rate_config.max) {
    rate_config.max = 100;
  }
}

app.server.on("request", (req, res) => {
  const ipAddress = req.ip;

  // Initialize request count for the IP address
  if (!requestCount.has(ipAddress)) {
    requestCount.set(ipAddress, 1);

    // Set a timer to reset the count after the duration
    setTimeout(() => {
      requestCount.delete(ipAddress);
    }, rate_config.duration * 1000);
  } else {
    // Increment the request count
    requestCount.set(ipAddress, requestCount.get(ipAddress) + 1);
    // Check if the request count exceeds the maximum allowed
    if (requestCount.get(ipAddress) > rate_config.max) {
      res.setHeader("Retry-After", rate_config.duration);
      res.status(429).send("Too many requests");
      return;
    }
  }
});

if (config.get("auto_update") === true) {
  const { Github } = require("../workers/github");
  const github = new Github(app, config.get("github_webhook_secret"));
  github.inatialiseRepoIfNoneExists();
  github.setGlobalPullConfig();
}

process.env.VIEWS_PATH = pagesPath;
process.env.VIEW_ENGINE = config.get("view_engine");

if (fs.existsSync(tablesPath) && fs.lstatSync(tablesPath).isDirectory()) {
  fs.readdirSync(tablesPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const table = require(path.join(tablesPath, file));
      if (table instanceof Table) {
        let tableName = table.name;
        if (tableName === "") {
          console.error("Table name is not defined");
        }
        database.add(table);
      } else {
      }
    }
  });
}

if (fs.existsSync(pagesPath) && fs.lstatSync(pagesPath).isDirectory()) {
  fs.readdirSync(pagesPath).forEach((folder) => {
    const folderPath = path.join(pagesPath, folder);
    if (fs.lstatSync(folderPath).isDirectory() || folder.includes("[")) {
      const folderKey = folder.includes("[") ? folder.slice(1, -1) : folder;
      fs.readdirSync(folderPath).forEach((file) => {
        const filePath = path.join(folderPath, file);
        if (file.endsWith(".html")) {
          const fileName = file.slice(0, -5); // Remove ".html" extension
          const isIndex = fileName === "index";
          let route;

          if (
            fileName.startsWith("[") &&
            fileName.endsWith("]") &&
            !fileName.slice(1, -1).includes("[") &&
            !fileName.slice(1, -1).includes("]")
          ) {
            // Treat as a single parameter route
            const paramKey = fileName.slice(1, -1);
            route = isIndex ? `/${folderKey}` : `/${folderKey}/:${paramKey}`;
          } else {
            // Normal route handling
            route = isIndex
              ? `/${folderKey}`
              : folderKey.startsWith("[") && folderKey.endsWith("]")
              ? `/:${folderKey}/:${fileName}`
              : folderKey.startsWith("[") && folderKey.endsWith("]")
              ? `/${folderKey}/${fileName}/:${fileName.slice(1, -1)}`
              : `/${folderKey}${isIndex ? "" : "/"}${fileName}`;
          }

          registerRoute(route, folder, fileName);
        } else if (fs.lstatSync(filePath).isDirectory()) {
          // Recursively register sub-folders
          processSubFolder(filePath, folderKey, pagesPath); // Pass folderKey as the parent folder
        }
      });
    } else if (folder.endsWith(".html")) {
      const fileName = folder.slice(0, -5); // Remove ".html" extension
      const isIndex = fileName === "index";
      const route = isIndex
        ? "/" // Register index file as /
        : fileName.startsWith("[") && fileName.endsWith("]")
        ? `/:${fileName.slice(1, -1)}`
        : `/${fileName}`;

      registerRoute(route, "/", fileName);
    }
  });
} else {
  throw new Error("The pages folder does not exist");
}

function processSubFolder(subFolderPath, parentFolderKey, mainFolderPath) {
  const subFolderName = path.basename(subFolderPath);
  const subFolderKey = subFolderName.includes("[")
    ? subFolderName.slice(1, -1)
    : subFolderName;
  fs.readdirSync(subFolderPath).forEach((subFile) => {
    const subFilePath = path.join(subFolderPath, subFile);
    if (subFile.endsWith(".html")) {
      const subFileName = subFile.slice(0, -5); // Remove ".html" extension
      const isIndex = subFileName === "index";
      let folderKey = parentFolderKey + "/" + subFolderKey;

      let route;

      if (
        subFileName.startsWith("[") &&
        subFileName.endsWith("]") &&
        !subFileName.slice(1, -1).includes("[") &&
        !subFileName.slice(1, -1).includes("]")
      ) {
        // Treat as a single parameter route
        const paramKey = subFileName.slice(1, -1);
        route = isIndex ? `/${folderKey}` : `/${folderKey}/:${paramKey}`;
      } else {
        // Normal route handling
        route = isIndex
          ? `/${folderKey}`
          : folderKey.startsWith("[") && folderKey.endsWith("]")
          ? `/:${folderKey}/:${subFileName}`
          : folderKey.startsWith("[") && folderKey.endsWith("]")
          ? `/${folderKey}/${subFileName}/:${subFileName.slice(1, -1)}`
          : `/${folderKey}${isIndex ? "" : "/"}${subFileName}`;
      }

      registerRoute(route, parentFolderKey + "/" + subFolderKey, subFileName);
    } else if (fs.lstatSync(subFilePath).isDirectory()) {
      // Recursively register sub-folders
      processSubFolder(subFilePath, parentFolderKey, mainFolderPath);
    }
  });
}

function registerRoute(route, folder, fileName) {
  app.get(route, (req, res) => {
    const options_file = path.join(
      process.cwd(),
      `/pages/${folder}/options.json`
    );
    if (fs.existsSync(options_file)) {
      const options = require(options_file);
      if (
        options.security &&
        req.session.user &&
        options.security.required_level > req.session.user.level
      ) {
        if (options.security.redirect) {
          res.redirect(options.security.redirect);
          return;
        } else {
          res.status(401).json({ error: true, message: "Unauthorized" });
          return;
        }
      } else {
        if (options.security && !req.session.user) {
          if (options.security.redirect) {
            res.redirect(options.security.redirect);
            return;
          } else {
            res.status(401).json({ error: true, message: "Unauthorized" });
            return;
          }
        }
      }
    }
    // Render the page corresponding to the route
    // You can customize this part based on your rendering logic
    const params = req.params;
    params.authenticated = req.session.user ? true : false;
    params.user = req.session.user;
    //Let's add the current page to the params
    //let it check if the current page is the index of a folder or not
    params.current_page = fileName === "index" ? folder : fileName;

    path.join(process.cwd(), `/pages/${folder}/${fileName}`);
    const filename = path.basename(`${folder}/${fileName}`);
    res.render(`${folder}/${filename}`, params);
  });
}

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(process.cwd(), "public/favicon.ico");
  if (fs.existsSync(faviconPath)) {
    res.file(faviconPath);
  } else {
    const defaultFaviconPath = path.join(__dirname, "assets/favicon.ico");
    res.file(defaultFaviconPath);
  }
});

const asset_dirs = config.get("asset_dirs");

if (asset_dirs) {
  for (const asset_dir of asset_dirs) {
    let dir = path.join(process.cwd(), asset_dir.path) || "";
    let httpPath = asset_dir.url || "";
    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
      throw new ObsidianError("Directory does not exist: " + dir);
    }
    app.dir(path.join(process.cwd(), asset_dir.path), httpPath);
  }
}

const workers = config.get("workers");

if (workers) {
  for (const worker of workers) {
    let routesPath = path.join(process.cwd(), worker.path) || "";
    let baseUrl = worker.baseurl || "";
    if (!fs.existsSync(routesPath) || !fs.lstatSync(routesPath).isDirectory()) {
      throw new Error("Directory does not exist: " + routesPath);
    }
    if (worker.enabled) {
      fs.readdirSync(routesPath).forEach((file) => {
        if (file.endsWith(".js")) {
          const router = require(path.join(routesPath, file));
          if (router instanceof Router) {
            let basePath = router.basePath;
            if (!basePath.startsWith("/")) {
              basePath = `/${basePath}`;
            }
            app.use(baseUrl + basePath, path.join(routesPath, file));
          } else {
            throw new Error("The router file must export a Router instance");
          }
        }
      });
    }
  }
}

app.use("/public", path.join(process.cwd(), "/public"));
app.use("/scripts", path.join(process.cwd(), "/public/js"));
app.use("/styles", path.join(process.cwd(), "/public/css"));

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

fs.readdir(path.join(__dirname, "resources"), (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(__dirname, "resources", file);
    app.get("/_obsidian/server/" + file, (req, res) => {
      res.file(filePath);
    });
  });
});
app.get("/robots.txt", (req, res) => {
  const robotsPath = path.join(process.cwd(), "public/robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.file(robotsPath);
  } else {
    const defaultRobotsPath = path.join(__dirname, "assets/robots.txt");
    res.file(defaultRobotsPath);
  }
});

app.post("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, (port) => {
  if (port === 80) {
    console.log(`Server listening on http://localhost/`);
    //openUrlInBrowser("http://localhost/");
  } else {
    console.log(`Server listening on http://localhost:${port}`);
    //openUrlInBrowser(`http://localhost:${port}`);
  }
});

function openUrlInBrowser(url) {
  if (process.platform === "win32") {
    spawn("rundll32", ["url.dll,FileProtocolHandler", url], { shell: true });
  } else if (process.platform === "darwin") {
    spawn("open", [url]);
  } else {
    spawn("xdg-open", [url]);
  }
}

module.exports = app;
