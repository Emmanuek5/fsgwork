const path = require("path");
const fs = require("fs");
const uuid = require("uuid");

class SessionManager {
  constructor(COOKIES_DIR) {
    this.COOKIES_DIR = COOKIES_DIR;
    this.sessions = [];
  }

  setupSession(request, response) {
    const sessionId = request.cookies["session_id"];
    if (sessionId) {
      // Load existing session
      request.session = this.loadSession(sessionId);
      if (request.session.user) {
        request.user = request.session.user;
      }
    } else {
      // Create a new session
      const newSessionId = uuid.v4();
      request.session = this.createSession(newSessionId);
      // Set the session ID cookie in the response
      response.setCookie("session_id", newSessionId);
    }
    request.session.save = () => {
      this.saveSession(request.session);
    };

    request.session.destroy = () => {
      request.session = this.createSession(sessionId);
      this.saveSession(request.session);
    };
  }

  createSession(sessionId) {
    const session = {
      id: sessionId,
      data: {},
    };
    this.saveSessionToFile(session);
    this.sessions.push(session);
    return session;
  }

  loadSession(sessionId) {
    const existingSession = this.sessions.find(
      (session) => session.id === sessionId
    );

    if (existingSession) {
      return existingSession;
    } else {
      const sessionFromFile = this.loadSessionFromFile(sessionId);
      if (sessionFromFile) {
        this.sessions.push(sessionFromFile);
        return sessionFromFile;
      } else {
        return this.createSession(sessionId);
      }
    }
  }

  saveSessionToFile(session) {
    const sessionFilePath = path.join(this.COOKIES_DIR, `${session.id}.json`);
    fs.writeFileSync(sessionFilePath, JSON.stringify(session));
  }

  saveSession(session) {
    //lets replace the session in the sessions array
    const index = this.sessions.findIndex((s) => s.id === session.id);
    if (index !== -1) {
      this.sessions[index] = session;
      this.saveSessionToFile(session);
    }
  }

  loadSessionFromFile(sessionId) {
    const sessionFilePath = path.join(this.COOKIES_DIR, `${sessionId}.json`);

    try {
      if (fs.existsSync(sessionFilePath)) {
        const sessionData = fs.readFileSync(sessionFilePath, "utf-8");
        const session = JSON.parse(sessionData);
        return session;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error loading session from file:", error);
      return null;
    }
  }
}

module.exports = SessionManager;
