import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

async function createLocalClient() {
  const memoryDb = new PGlite();
  const today = Date.now();
  const isoDate = (offsetDays: number) =>
    new Date(today + offsetDays * 24 * 60 * 60 * 1000).toISOString();
  const dateOnly = (offsetDays: number) => isoDate(offsetDays).slice(0, 10);

  await memoryDb.exec(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      username text NOT NULL UNIQUE,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'sewadar',
      password_hash text NOT NULL,
      last_login timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE events (
      id serial PRIMARY KEY,
      title text NOT NULL,
      date text NOT NULL,
      type text NOT NULL,
      volunteers_needed integer NOT NULL DEFAULT 0,
      estimated_budget numeric(12, 2) NOT NULL DEFAULT 0,
      description text,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE volunteers (
      id serial PRIMARY KEY,
      event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name text NOT NULL,
      phone text NOT NULL,
      department text NOT NULL,
      registered_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE expenses (
      id serial PRIMARY KEY,
      event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      description text NOT NULL,
      amount numeric(12, 2) NOT NULL,
      date text NOT NULL,
      logged_by integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE notifications (
      id serial PRIMARY KEY,
      title text NOT NULL,
      message text NOT NULL,
      audience text NOT NULL,
      channels text[] NOT NULL DEFAULT ARRAY[]::text[],
      event_id integer REFERENCES events(id) ON DELETE SET NULL,
      sent_by integer REFERENCES users(id) ON DELETE SET NULL,
      sent_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE activity_logs (
      id serial PRIMARY KEY,
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL,
      "timestamp" timestamp NOT NULL DEFAULT now()
    );
  `);

  await memoryDb.exec(`
    INSERT INTO users (username, name, role, password_hash, last_login, created_at) VALUES
      ('admin@sewasync.local', 'Amrit Singh', 'super_admin', 'admin123', now() - interval '2 days', now() - interval '14 days'),
      ('manager@sewasync.local', 'Harpreet Kaur', 'event_manager', 'manager123', now() - interval '1 day', now() - interval '10 days'),
      ('sewadar@sewasync.local', 'Kuldeep Singh', 'sewadar', 'sewadar123', NULL, now() - interval '7 days');

    INSERT INTO events (title, date, type, volunteers_needed, estimated_budget, description, created_at) VALUES
      ('Gurpurab Samagam', '${dateOnly(14)}', 'major_gurpurab', 40, 75000, 'Main Gurpurab program for the month', now() - interval '4 days'),
      ('Weekly Diwan', '${dateOnly(7)}', 'regular_diwan', 18, 12000, 'Regular Sunday evening diwan', now() - interval '3 days'),
      ('Langar Seva Camp', '${dateOnly(-6)}', 'community_camp', 24, 18000, 'Community langar and seva camp', now() - interval '12 days');

    INSERT INTO volunteers (event_id, name, phone, department, registered_at) VALUES
      (1, 'Ravinder', '9876543210', 'langar', now() - interval '2 days'),
      (1, 'Simran', '9876501234', 'security', now() - interval '2 days'),
      (2, 'Amandeep', '9876505678', 'kirtan_stage', now() - interval '1 day'),
      (3, 'Jaspreet', '9876509999', 'cleaning', now() - interval '11 days');

    INSERT INTO expenses (event_id, description, amount, date, logged_by, created_at) VALUES
      (1, 'Decoration and floral arrangements', 14500, '${dateOnly(-3)}', 1, now() - interval '3 days'),
      (2, 'Sound system rental', 8200, '${dateOnly(-1)}', 2, now() - interval '1 day'),
      (3, 'Langar supplies', 6300, '${dateOnly(-5)}', 1, now() - interval '5 days');

    INSERT INTO notifications (title, message, audience, channels, event_id, sent_by, sent_at) VALUES
      ('Gurpurab reminder', 'Please arrive early for seva and setup.', 'event_volunteers', ARRAY['sms', 'email'], 1, 1, now() - interval '1 day'),
      ('Weekly Diwan update', 'The weekly diwan schedule is confirmed.', 'all_sangat', ARRAY['email'], 2, 2, now() - interval '6 hours');

    INSERT INTO activity_logs (user_id, action, "timestamp") VALUES
      (1, 'Created Gurpurab Samagam event', now() - interval '4 days'),
      (2, 'Logged sound system expense', now() - interval '1 day'),
      (1, 'Sent reminder notification', now() - interval '1 day');
  `);

  return memoryDb;
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : await createLocalClient();

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : drizzlePglite(pool, { schema });

export * from "./schema";
