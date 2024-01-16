function checkRequiredFields(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      if (!req.body[field]) {
        return res
          .status(400)
          .json({ error: true, message: `Missing '${field}' field` });
      }
    }
    next();
  };
}
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
}

function checkNotAuth(req, res, next) {
  if (!req.session.user) {
    next();
  } else {
    res.status(401).json({ error: true, message: "you are already logged in" });
  }
}

function checkAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: true, message: "Unauthorized" });
  }
}

module.exports = { checkRequiredFields, checkAuth, checkNotAuth, checkAdmin };
