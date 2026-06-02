import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/staypilot.db'
  : path.join(process.cwd(), 'data', 'staypilot.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  if (process.env.NODE_ENV !== 'production') {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  migrate(db)
  migrateInvoices(db)
  return db
}

function migrateInvoices(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      invoice_number TEXT UNIQUE NOT NULL,
      guest_name TEXT NOT NULL,
      guest_email TEXT,
      property_name TEXT NOT NULL,
      property_address TEXT,
      property_city TEXT,
      checkin_date TEXT NOT NULL,
      checkout_date TEXT NOT NULL,
      nights INTEGER NOT NULL,
      price_per_night REAL NOT NULL,
      total REAL NOT NULL,
      email_sent INTEGER DEFAULT 0,
      email_sent_at TEXT,
      issued_at TEXT DEFAULT (datetime('now'))
    );
  `)
  // migration pour les factures existantes
  const icols = (db.prepare('PRAGMA table_info(invoices)').all() as {name: string}[]).map(c => c.name)
  if (!icols.includes('property_address')) db.exec('ALTER TABLE invoices ADD COLUMN property_address TEXT')
  if (!icols.includes('property_city')) db.exec('ALTER TABLE invoices ADD COLUMN property_city TEXT')
  if (!icols.includes('acquittee')) db.exec('ALTER TABLE invoices ADD COLUMN acquittee INTEGER DEFAULT 1')
}

function migrate(db: Database.Database) {
  const cols = (db.prepare('PRAGMA table_info(properties)').all() as {name: string}[]).map(c => c.name)
  if (!cols.includes('ical_url')) db.exec('ALTER TABLE properties ADD COLUMN ical_url TEXT')
  if (!cols.includes('ical_last_sync')) db.exec('ALTER TABLE properties ADD COLUMN ical_last_sync TEXT')
  if (!cols.includes('guide_url')) db.exec('ALTER TABLE properties ADD COLUMN guide_url TEXT')
  if (!cols.includes('contact_email')) db.exec('ALTER TABLE properties ADD COLUMN contact_email TEXT')
  const rcols2 = (db.prepare('PRAGMA table_info(reservations)').all() as {name: string}[]).map(c => c.name)
  if (!rcols2.includes('source')) db.exec("ALTER TABLE reservations ADD COLUMN source TEXT DEFAULT 'manual'")
  const tcols = (db.prepare('PRAGMA table_info(message_templates)').all() as {name: string}[]).map(c => c.name)
  if (!tcols.includes('send_hour')) db.exec('ALTER TABLE message_templates ADD COLUMN send_hour INTEGER DEFAULT NULL')

  // Settings & Gmail
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gmail_synced (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      synced_at TEXT DEFAULT (datetime('now'))
    );
  `)
  const rcols = (db.prepare('PRAGMA table_info(reservations)').all() as {name: string}[]).map(c => c.name)
  if (!rcols.includes('ical_uid')) db.exec('ALTER TABLE reservations ADD COLUMN ical_uid TEXT')
  if (!rcols.includes('guest_count')) db.exec('ALTER TABLE reservations ADD COLUMN guest_count INTEGER')
  if (!rcols.includes('has_animal')) db.exec('ALTER TABLE reservations ADD COLUMN has_animal TEXT')
  if (!rcols.includes('arrival_time')) db.exec('ALTER TABLE reservations ADD COLUMN arrival_time TEXT')
  if (!rcols.includes('tally_filled')) db.exec('ALTER TABLE reservations ADD COLUMN tally_filled INTEGER DEFAULT 0')
  if (!rcols.includes('guest2_firstname')) db.exec('ALTER TABLE reservations ADD COLUMN guest2_firstname TEXT')
  if (!rcols.includes('has_minor')) db.exec('ALTER TABLE reservations ADD COLUMN has_minor INTEGER')
  if (!rcols.includes('departure_time')) db.exec('ALTER TABLE reservations ADD COLUMN departure_time TEXT')
  if (!rcols.includes('needs_pet_equipment')) db.exec('ALTER TABLE reservations ADD COLUMN needs_pet_equipment INTEGER')
  if (!rcols.includes('pet_name')) db.exec('ALTER TABLE reservations ADD COLUMN pet_name TEXT')
  if (!rcols.includes('pet_description')) db.exec('ALTER TABLE reservations ADD COLUMN pet_description TEXT')
  if (!rcols.includes('ttlock_pwd_id')) db.exec('ALTER TABLE reservations ADD COLUMN ttlock_pwd_id INTEGER')
  if (!cols.includes('ical_url_booking')) db.exec('ALTER TABLE properties ADD COLUMN ical_url_booking TEXT')
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_res_ical_uid ON reservations(ical_uid) WHERE ical_uid IS NOT NULL') } catch {}
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      platforms TEXT DEFAULT 'airbnb',
      max_guests INTEGER DEFAULT 2,
      wifi_name TEXT,
      wifi_password TEXT,
      checkin_time TEXT DEFAULT '16:00',
      checkout_time TEXT DEFAULT '11:00',
      lock_code_prefix TEXT,
      cleaner_email TEXT,
      cleaner_name TEXT,
      owner_name TEXT,
      owner_email TEXT,
      commission_rate REAL DEFAULT 20,
      notes TEXT,
      ical_url TEXT,
      ical_last_sync TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      guest_name TEXT NOT NULL,
      guest_email TEXT,
      guest_phone TEXT,
      checkin_date TEXT NOT NULL,
      checkout_date TEXT NOT NULL,
      nights INTEGER NOT NULL,
      price_per_night REAL NOT NULL,
      total_revenue REAL NOT NULL,
      platform TEXT DEFAULT 'airbnb',
      status TEXT DEFAULT 'confirmed',
      notes TEXT,
      lock_code TEXT,
      messages_sent TEXT DEFAULT '[]',
      ical_uid TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_ical_uid ON reservations(ical_uid) WHERE ical_uid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL,
      delay_hours INTEGER DEFAULT 0,
      subject TEXT,
      body TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER REFERENCES properties(id),
      reservation_id INTEGER REFERENCES reservations(id),
      type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}
