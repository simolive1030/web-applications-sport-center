import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Path to the SQLite database file with ./ because it is relative to the current working directory (CWD) of the Node.js process
const DB_PATH = './sports.db';

// Open the database
const db = await open({
  filename: DB_PATH,
  driver: sqlite3.Database,
});

// Enable foreign key constraints
await db.exec('PRAGMA foreign_keys = ON;');

export default db;



