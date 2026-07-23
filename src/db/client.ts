import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// The prod client is created lazily: importing this module (e.g. transitively,
// via a server-action module imported into a Vitest test with no DATABASE_URL)
// must not throw. The actual postgres() connection, and the DATABASE_URL read,
// only happen the first time a property of `db` is accessed.
type Schema = typeof schema;

let realDb: PostgresJsDatabase<Schema> | undefined;

function getDb(): PostgresJsDatabase<Schema> {
  if (!realDb) {
    const client = postgres(process.env.DATABASE_URL!, { prepare: false });
    realDb = drizzle(client, { schema });
  }
  return realDb;
}

export const db: PostgresJsDatabase<Schema> = new Proxy({} as PostgresJsDatabase<Schema>, {
  get(_target, prop) {
    const target = getDb();
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
