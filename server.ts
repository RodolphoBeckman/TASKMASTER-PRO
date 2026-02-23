import express from "express";
import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Configuration
const isPostgres = !!process.env.DATABASE_URL;
let db: any;
let pgPool: pg.Pool | null = null;

if (isPostgres) {
  const dbUrl = process.env.DATABASE_URL || "";
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`Tentando conectar ao PostgreSQL: ${maskedUrl}`);
  
  pgPool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  console.log("Using PostgreSQL Database");
} else {
  const dbPath = process.env.VERCEL ? '/tmp/tasks.db' : 'tasks.db';
  db = new Database(dbPath);
  console.log("Using SQLite Database");
}

// Helper to run queries on either DB
async function query(text: string, params: any[] = []) {
  if (isPostgres && pgPool) {
    const res = await pgPool.query(text, params);
    return res.rows;
  } else {
    // Convert Postgres $1, $2 syntax to SQLite ? if needed, 
    // but here we'll just handle the specific calls
    return db.prepare(text).all(...params);
  }
}

async function run(text: string, params: any[] = []) {
  if (isPostgres && pgPool) {
    const res = await pgPool.query(text, params);
    return { lastInsertRowid: res.rows[0]?.id };
  } else {
    const result = db.prepare(text).run(...params);
    return { lastInsertRowid: result.lastInsertRowid };
  }
}

async function getOne(text: string, params: any[] = []) {
  if (isPostgres && pgPool) {
    const res = await pgPool.query(text, params);
    return res.rows[0];
  } else {
    return db.prepare(text).get(...params);
  }
}

// Function to initialize and seed the database
async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('master', 'collaborator')),
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      assigned_to INTEGER,
      status TEXT DEFAULT 'pending',
      failure_reason TEXT,
      due_date TEXT,
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      type TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      content TEXT,
      date TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `;

  // SQLite specific adjustments for schema if needed
  const sqliteSchema = schema.replace(/SERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT");

  if (isPostgres && pgPool) {
    await pgPool.query(schema);
  } else {
    db.exec(sqliteSchema);
  }

  // Seed initial master user if not exists
  const master = await getOne("SELECT * FROM users WHERE role = 'master'");
  if (!master) {
    await run("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)", ["admin", "admin123", "master", "Administrador"]);
  }
}

// Initialize immediately
initDb().catch(console.error);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Middleware to ensure DB is initialized (extra safety for serverless)
  app.use(async (req, res, next) => {
    try {
      await initDb();
      next();
    } catch (e) {
      console.error("DB Init Error:", e);
      next();
    }
  });

  // Simple API Key middleware for AI integration
  const aiAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey) {
      const cleanKey = String(apiKey).replace('Bearer ', '');
      if (process.env.AI_API_KEY && cleanKey === process.env.AI_API_KEY) {
        next();
      } else {
        res.status(401).json({ error: "Unauthorized: Invalid API Key" });
      }
    } else {
      next();
    }
  };

  // API Documentation
  app.get("/api/docs", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    res.json({
      openapi: "3.0.0",
      info: { title: "TaskMaster Pro API", version: "1.0.0" },
      servers: [{ url: appUrl }],
      paths: { /* ... same as before ... */ }
    });
  });

  // Auth API
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await getOne("SELECT id, username, role, name FROM users WHERE username = $1 AND password = $2", [username, password]);
      if (user) {
        res.json(user);
      } else {
        console.log(`Login falhou: Usuário '${username}' não encontrado ou senha incorreta.`);
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("Erro crítico no login:", error);
      res.status(500).json({ error: "Erro interno no servidor ao tentar logar. Verifique a conexão com o banco de dados." });
    }
  });

  // Users API
  app.get("/api/users", aiAuth, async (req, res) => {
    const users = await query("SELECT id, username, role, name FROM users WHERE role = 'collaborator'");
    res.json(users);
  });

  app.post("/api/users", aiAuth, async (req, res) => {
    const { username, password, name } = req.body;
    try {
      const result = await run("INSERT INTO users (username, password, role, name) VALUES ($1, $2, 'collaborator', $3) RETURNING id", [username, password, name]);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Usuário já existe" });
    }
  });

  // Tasks API
  app.get("/api/tasks", aiAuth, async (req, res) => {
    const { userId, role } = req.query;
    let tasks;
    if (role === 'master' || !userId) {
      tasks = await query(`
        SELECT t.*, u.name as assigned_name 
        FROM tasks t 
        JOIN users u ON t.assigned_to = u.id
      `);
    } else {
      tasks = await query("SELECT * FROM tasks WHERE assigned_to = $1", [userId]);
    }
    res.json(tasks);
  });

  app.post("/api/tasks", aiAuth, async (req, res) => {
    const { title, description, assigned_to, due_date } = req.body;
    const result = await run("INSERT INTO tasks (title, description, assigned_to, due_date) VALUES ($1, $2, $3, $4) RETURNING id", [title, description, assigned_to, due_date]);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/tasks/:id", aiAuth, async (req, res) => {
    const { status, failure_reason } = req.body;
    await run("UPDATE tasks SET status = $1, failure_reason = $2 WHERE id = $3", [status, failure_reason || null, req.params.id]);
    res.json({ success: true });
  });

  // Time Logs API
  app.get("/api/time-logs/:userId", aiAuth, async (req, res) => {
    const logs = await query("SELECT * FROM time_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50", [req.params.userId]);
    res.json(logs);
  });

  app.post("/api/time-logs", aiAuth, async (req, res) => {
    const { userId, type } = req.body;
    await run("INSERT INTO time_logs (user_id, type) VALUES ($1, $2)", [userId, type]);
    res.json({ success: true });
  });

  // Feedback API
  app.get("/api/feedback/:userId", aiAuth, async (req, res) => {
    const feedback = await query("SELECT * FROM feedback WHERE user_id = $1 ORDER BY date DESC", [req.params.userId]);
    res.json(feedback);
  });

  app.post("/api/feedback", aiAuth, async (req, res) => {
    const { userId, content, date } = req.body;
    await run("INSERT INTO feedback (user_id, content, date) VALUES ($1, $2, $3)", [userId, content, date]);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
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
