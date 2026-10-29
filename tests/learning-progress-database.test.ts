import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, service_role;`);
  await db.exec(await readFile(new URL("../supabase/migrations/202610260001_learning_progress.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
});
after(async () => { await db.close(); });
async function asUser<T>(user: string, work: () => Promise<T>) {
  await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  try { return await work(); } finally { await db.exec("reset role"); }
}

test("learning progress is readable and writable only by its owner, never anonymous", async () => {
  const value = JSON.stringify({ lessons: {}, checkpoints: {}, drafts: { tables: { step: 3 } } });
  await asUser(alice, async () => {
    await db.query("insert into public.learning_progress(user_id,data) values($1,$2::jsonb)", [alice, value]);
    const own = await db.query<{ user_id: string; data: unknown }>("select user_id,data from public.learning_progress");
    assert.equal(own.rows.length, 1); assert.equal(own.rows[0].user_id, alice); assert.deepEqual(own.rows[0].data, JSON.parse(value));
  });
  await asUser(bob, async () => {
    assert.equal((await db.query("select * from public.learning_progress")).rows.length, 0);
    await assert.rejects(db.query("insert into public.learning_progress(user_id) values($1)", [alice]), /row-level security/);
    assert.equal((await db.query("update public.learning_progress set revision=2 where user_id=$1 returning user_id", [alice])).rows.length, 0);
    await db.query("insert into public.learning_progress(user_id) values($1)", [bob]);
    await assert.rejects(db.query("update public.learning_progress set user_id=$1 where user_id=$2", [alice, bob]), /row-level security/);
  });
  await db.exec("set role anon");
  try { await assert.rejects(db.query("select * from public.learning_progress"), /permission denied/); }
  finally { await db.exec("reset role"); }
});

test("revision compare-and-swap rejects stale writes without replacing data", async () => {
  await asUser(alice, async () => {
    const first = await db.query("update public.learning_progress set revision=2, data=$2::jsonb where user_id=$1 and revision=1 returning revision", [alice, JSON.stringify({ lessons: {}, checkpoints: {}, drafts: {} })]);
    assert.equal(first.rows.length, 1);
    const stale = await db.query("update public.learning_progress set revision=2, data='{}' where user_id=$1 and revision=1 returning revision", [alice]);
    assert.equal(stale.rows.length, 0);
    assert.equal((await db.query<{ revision: number }>("select revision from public.learning_progress")).rows[0].revision, 2);
    await assert.rejects(db.query("update public.learning_progress set revision=0"), /check constraint/);
    await assert.rejects(db.query("update public.learning_progress set data='[]'::jsonb"), /check constraint/);
    await assert.rejects(db.query("delete from public.learning_progress"), /permission denied/);
  });
});
