import { Database } from "bun:sqlite";

// 1. Connect to database file
export const db = new Database("chat.db");

// 2. Create tables (run once)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
`);

// 3. Add user (with prepared statements for security)
export const addUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash)
    VALUES (?, ?, ?, ?)
`);
