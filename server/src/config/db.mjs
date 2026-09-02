import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = './sports.db';

// Open the database
const db = await open({
  filename: DB_PATH,
  driver: sqlite3.Database,
});

// Enable foreign key constraints
await db.exec('PRAGMA foreign_keys = ON;');

export default db;



