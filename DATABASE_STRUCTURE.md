# Estrutura do Banco de Dados - TaskMaster Pro

Este documento descreve a estrutura das tabelas, colunas e relacionamentos do banco de dados utilizado no sistema TaskMaster Pro.

---

## 📊 Estrutura Visual (ERD)

```text
  +----------------+          +----------------+
  |     users      |          |     tasks      |
  +----------------+          +----------------+
  | id (PK)        |<---+     | id (PK)        |
  | username (UQ)  |    |     | title          |
  | password       |    +---- | assigned_to(FK)|
  | role           |    |     | description    |
  | name           |    |     | status         |
  +----------------+    |     | failure_reason |
          |             |     | due_date       |
          |             |     +----------------+
          |             |
          |             |     +----------------+
          |             |     |   time_logs    |
          |             |     +----------------+
          |             +---- | id (PK)        |
          +------------------ | user_id (FK)   |
          |             |     | type           |
          |             |     | timestamp      |
          |             |     +----------------+
          |             |
          |             |     +----------------+
          |             |     |    feedback    |
          |             |     +----------------+
          |             +---- | id (PK)        |
          +------------------ | user_id (FK)   |
                              | content        |
                              | date           |
                              +----------------+

Legenda:
PK = Primary Key (Chave Primária)
FK = Foreign Key (Chave Estrangeira)
UQ = Unique (Único)
```

---

## 📋 Detalhamento das Tabelas

### 1. Tabela: `users` (Usuários)
Armazena as informações de login e perfil dos usuários.

| Coluna | Tipo (Postgres) | Tipo (SQLite) | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `INTEGER` | Identificador único (Auto-incremento) |
| `username` | `TEXT` | `TEXT` | Nome de usuário para login (Único) |
| `password` | `TEXT` | `TEXT` | Senha de acesso |
| `role` | `TEXT` | `TEXT` | Papel: 'master' ou 'collaborator' |
| `name` | `TEXT` | `TEXT` | Nome completo do usuário |

### 2. Tabela: `tasks` (Tarefas)
Armazena as tarefas criadas e atribuídas aos colaboradores.

| Coluna | Tipo (Postgres) | Tipo (SQLite) | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `INTEGER` | Identificador único |
| `title` | `TEXT` | `TEXT` | Título da tarefa |
| `description` | `TEXT` | `TEXT` | Detalhes da tarefa |
| `assigned_to` | `INTEGER` | `INTEGER` | ID do usuário (FK para `users.id`) |
| `status` | `TEXT` | `TEXT` | 'pending', 'completed' ou 'failed' |
| `failure_reason`| `TEXT` | `TEXT` | Motivo caso a tarefa falhe |
| `due_date` | `TEXT` | `TEXT` | Data de entrega (Formato: YYYY-MM-DD) |

### 3. Tabela: `time_logs` (Registro de Ponto)
Registra as entradas, saídas e pausas dos colaboradores.

| Coluna | Tipo (Postgres) | Tipo (SQLite) | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `INTEGER` | Identificador único |
| `user_id` | `INTEGER` | `INTEGER` | ID do usuário (FK para `users.id`) |
| `type` | `TEXT` | `TEXT` | 'start', 'pause', 'resume' ou 'end' |
| `timestamp` | `TIMESTAMP` | `DATETIME` | Data e hora exata do registro |

### 4. Tabela: `feedback` (Feedback Diário)
Armazena as observações de desempenho enviadas pelo Master.

| Coluna | Tipo (Postgres) | Tipo (SQLite) | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `INTEGER` | Identificador único |
| `user_id` | `INTEGER` | `INTEGER` | ID do usuário (FK para `users.id`) |
| `content` | `TEXT` | `TEXT` | Conteúdo do feedback |
| `date` | `TEXT` | `TEXT` | Data do feedback (Formato: YYYY-MM-DD) |

---

## 🛠️ Script SQL de Criação (Referência)

```sql
-- Criação das tabelas
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('master', 'collaborator')) NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  failure_reason TEXT,
  due_date TEXT NOT NULL
);

CREATE TABLE time_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  date TEXT NOT NULL
);

-- Usuário padrão
INSERT INTO users (username, password, role, name) 
VALUES ('admin', 'admin123', 'master', 'Administrador');
```

