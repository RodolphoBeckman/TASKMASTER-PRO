import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.VERCEL ? '/tmp/tasks.db' : 'tasks.db';
const db = new Database(dbPath);

// Function to initialize and seed the database
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('master', 'collaborator')),
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      assigned_to INTEGER,
      status TEXT DEFAULT 'pending',
      failure_reason TEXT,
      due_date TEXT,
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT,
      date TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Seed initial master user if not exists
  const masterExists = db.prepare("SELECT * FROM users WHERE role = 'master'").get();
  if (!masterExists) {
    db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run("admin", "admin123", "master", "Administrador");
  }
}

// Initialize immediately
initDb();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Middleware to ensure DB is initialized (extra safety for serverless)
  app.use((req, res, next) => {
    try {
      initDb();
      next();
    } catch (e) {
      console.error("DB Init Error:", e);
      next();
    }
  });

  // Simple API Key middleware for AI integration
  const aiAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Express lowercases all headers, so 'X-API-KEY' becomes 'x-api-key'
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    // If an API key is provided, it must match
    if (apiKey) {
      const cleanKey = String(apiKey).replace('Bearer ', '');
      if (process.env.AI_API_KEY && cleanKey === process.env.AI_API_KEY) {
        next();
      } else {
        res.status(401).json({ error: "Unauthorized: Invalid API Key" });
      }
    } else {
      // No API key provided, assume frontend request
      next();
    }
  };

  // API Documentation for Manus AI
  app.get("/api/docs", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    res.json({
      openapi: "3.0.0",
      info: {
        title: "TaskMaster Pro API",
        description: "API para gestão de tarefas, equipe e ponto eletrônico.",
        version: "1.0.0"
      },
      servers: [{ url: appUrl }],
      paths: {
        "/api/tasks": {
          get: {
            summary: "Listar tarefas",
            parameters: [
              { name: "userId", in: "query", schema: { type: "integer" } },
              { name: "role", in: "query", schema: { type: "string", enum: ["master", "collaborator"] } }
            ],
            responses: { "200": { description: "Lista de tarefas" } }
          },
          post: {
            summary: "Criar nova tarefa",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      assigned_to: { type: "integer" },
                      due_date: { type: "string", format: "date" }
                    },
                    required: ["title", "assigned_to", "due_date"]
                  }
                }
              }
            },
            responses: { "200": { description: "Tarefa criada" } }
          }
        },
        "/api/tasks/{id}": {
          patch: {
            summary: "Atualizar status da tarefa",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["pending", "completed", "failed"] },
                      failure_reason: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: { "200": { description: "Tarefa atualizada" } }
          }
        },
        "/api/users": {
          get: {
            summary: "Listar colaboradores",
            responses: { "200": { description: "Lista de usuários" } }
          }
        },
        "/api/feedback": {
          post: {
            summary: "Enviar feedback",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      userId: { type: "integer" },
                      content: { type: "string" },
                      date: { type: "string", format: "date" }
                    }
                  }
                }
              }
            },
            responses: { "200": { description: "Feedback enviado" } }
          }
        }
      }
    });
  });

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role, name FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Users API
  app.get("/api/users", aiAuth, (req, res) => {
    const users = db.prepare("SELECT id, username, role, name FROM users WHERE role = 'collaborator'").all();
    res.json(users);
  });

  app.post("/api/users", aiAuth, (req, res) => {
    const { username, password, name } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, 'collaborator', ?)").run(username, password, name);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Usuário já existe" });
    }
  });

  // Tasks API
  app.get("/api/tasks", aiAuth, (req, res) => {
    const { userId, role } = req.query;
    let tasks;
    if (role === 'master' || !userId) {
      tasks = db.prepare(`
        SELECT t.*, u.name as assigned_name 
        FROM tasks t 
        JOIN users u ON t.assigned_to = u.id
      `).all();
    } else {
      tasks = db.prepare("SELECT * FROM tasks WHERE assigned_to = ?").all(userId);
    }
    res.json(tasks);
  });

  app.post("/api/tasks", aiAuth, (req, res) => {
    const { title, description, assigned_to, due_date } = req.body;
    const result = db.prepare("INSERT INTO tasks (title, description, assigned_to, due_date) VALUES (?, ?, ?, ?)").run(title, description, assigned_to, due_date);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/tasks/:id", aiAuth, (req, res) => {
    const { status, failure_reason } = req.body;
    db.prepare("UPDATE tasks SET status = ?, failure_reason = ? WHERE id = ?").run(status, failure_reason || null, req.params.id);
    res.json({ success: true });
  });

  // Time Logs API
  app.get("/api/time-logs/:userId", aiAuth, (req, res) => {
    const logs = db.prepare("SELECT * FROM time_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.params.userId);
    res.json(logs);
  });

  app.post("/api/time-logs", aiAuth, (req, res) => {
    const { userId, type } = req.body;
    db.prepare("INSERT INTO time_logs (user_id, type) VALUES (?, ?)").run(userId, type);
    res.json({ success: true });
  });

  // Feedback API
  app.get("/api/feedback/:userId", aiAuth, (req, res) => {
    const feedback = db.prepare("SELECT * FROM feedback WHERE user_id = ? ORDER BY date DESC").all(req.params.userId);
    res.json(feedback);
  });

  app.post("/api/feedback", aiAuth, (req, res) => {
    const { userId, content, date } = req.body;
    db.prepare("INSERT INTO feedback (user_id, content, date) VALUES (?, ?, ?)").run(userId, content, date);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  if (!process.env.VERCEL) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

export default startServer();
