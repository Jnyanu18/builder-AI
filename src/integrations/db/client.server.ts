// Server-only MongoDB access layer.
//
// Exposes a small PostgREST-style query builder (from/select/eq/order/limit/
// insert/update/upsert/delete) so server functions read the same as before.
// `db` is the unscoped admin client; `createUserDb(userId)` returns a client
// that enforces the access rules the old Postgres RLS policies provided.
import { MongoClient, type Db, type Filter } from "mongodb";
import { randomBytes, randomUUID } from "node:crypto";

// Rows are loosely typed (schema lives in the app, not the database).
type Row = any;
type DbResult<T = Row[]> = { data: T | null; error: { message: string; code?: string } | null; count?: number | null };

let clientPromise: Promise<Db> | undefined;

function getDb(): Promise<Db> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI. Add your MongoDB Atlas connection string to .env.");
    clientPromise = (async () => {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const database = client.db(process.env.MONGODB_DB || "intentos");
      await ensureIndexes(database);
      return database;
    })();
    // Allow a retry on the next request if the first connect failed.
    clientPromise.catch(() => {
      clientPromise = undefined;
    });
  }
  return clientPromise;
}

async function ensureIndexes(d: Db) {
  await Promise.all([
    d.collection<Row>("users").createIndex({ email: 1 }, { unique: true }),
    d.collection<Row>("projects").createIndex({ api_token: 1 }, { unique: true }),
    d.collection<Row>("projects").createIndex({ owner_id: 1 }),
    d.collection<Row>("blueprint_versions").createIndex({ project_id: 1, version_number: 1 }, { unique: true }),
    d.collection<Row>("project_members").createIndex({ project_id: 1, user_id: 1 }, { unique: true }),
    d.collection<Row>("project_members").createIndex({ user_id: 1 }),
    d.collection<Row>("project_invites").createIndex({ project_id: 1, email: 1 }, { unique: true }),
    d.collection<Row>("chat_messages").createIndex({ project_id: 1, created_at: 1 }),
    d.collection<Row>("docs").createIndex({ project_id: 1 }),
    d.collection<Row>("repositories").createIndex({ project_id: 1 }),
    d.collection<Row>("drift_reports").createIndex({ project_id: 1, created_at: -1 }),
    d.collection<Row>("approvals").createIndex({ project_id: 1, created_at: -1 }),
    d.collection<Row>("change_history").createIndex({ project_id: 1, created_at: -1 }),
  ]);
}

const token = () => randomBytes(24).toString("hex");
const now = () => new Date().toISOString();

// Column defaults the Postgres schema used to apply.
const DEFAULTS: Record<string, () => Row> = {
  profiles: () => ({ display_name: null, avatar_url: null }),
  projects: () => ({ description: null, status: "active", api_token: token() }),
  blueprint_versions: () => ({
    vision: "",
    personas: [],
    functional_reqs: [],
    nonfunctional_reqs: [],
    architecture: {},
    constraints: [],
    milestones: [],
    success_metrics: [],
    is_draft: true,
    approved_at: null,
    approved_by: null,
  }),
  repositories: () => ({
    branch: "main",
    access_token: null,
    last_scan_at: null,
    last_commit_sha: null,
    status: "connected",
    webhook_secret: token(),
  }),
  repository_scans: () => ({
    commit_sha: null,
    status: "pending",
    raw_files: {},
    error: null,
    started_at: now(),
    finished_at: null,
  }),
  reality_models: () => ({
    frontend: null,
    backend: null,
    database: null,
    infrastructure: [],
    dependencies: [],
    services: [],
    api_routes: [],
    features: [],
    summary: null,
  }),
  drift_reports: () => ({
    blueprint_version_id: null,
    reality_model_id: null,
    alignment_score: 0,
    drift_score: 0,
    feature_coverage: {},
    findings: [],
    summary: null,
  }),
  approvals: () => ({
    decision: "pending",
    note: null,
    decided_by: null,
    decided_at: null,
    resulting_blueprint_version_id: null,
  }),
  change_history: () => ({ payload: {}, actor_id: null }),
  project_members: () => ({ role: "editor" }),
  project_invites: () => ({ role: "editor", accepted_at: null }),
  chat_messages: () => ({ user_id: null, role: "user", is_ai: false }),
  docs: () => ({
    parent_id: null,
    title: "Untitled",
    icon: null,
    content: { type: "doc", content: [] },
    position: 0,
  }),
};

const HAS_UPDATED_AT = new Set(["profiles", "projects", "blueprint_versions", "repositories", "docs"]);

/** Tables whose rows hang off a project via `project_id`. */
const PROJECT_CHILDREN = [
  "blueprint_versions",
  "repositories",
  "repository_scans",
  "reality_models",
  "drift_reports",
  "approvals",
  "change_history",
  "project_members",
  "project_invites",
  "chat_messages",
  "docs",
];

function toDoc(row: Row): Row {
  const { id, ...rest } = row;
  return { _id: id ?? randomUUID(), ...rest };
}

function fromDoc(doc: Row | null | undefined, cols?: string[]): Row | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const full: Row = { id: _id, ...rest };
  if (!cols) return full;
  const out: Row = {};
  for (const c of cols) if (c in full) out[c] = full[c];
  return out;
}

function parseColumns(sel: string | undefined): string[] | undefined {
  if (!sel || sel.trim() === "*") return undefined;
  if (sel.includes("(")) throw new Error(`Unsupported select expression: ${sel}`);
  return sel.split(",").map((s) => s.trim()).filter(Boolean);
}

const field = (col: string) => (col === "id" ? "_id" : col);

type ScopeCache = { member?: Promise<string[]>; owner?: Promise<string[]> };

type Cond = { col: string; op: "eq" | "neq" | "in" | "is"; val: unknown };
type Op = "select" | "insert" | "update" | "upsert" | "delete";

/** Access policy for a user-scoped client; mirrors the old RLS policies. */
type Policy = {
  read: "all" | "none" | "member-project" | "member-id" | "self-id" | "owner-project";
  write: "none" | "member-project" | "owner-id" | "self-id" | "owner-project";
};
const POLICIES: Record<string, Policy> = {
  profiles: { read: "all", write: "self-id" },
  projects: { read: "member-id", write: "owner-id" },
  project_members: { read: "member-project", write: "owner-project" },
  project_invites: { read: "owner-project", write: "owner-project" },
  chat_messages: { read: "member-project", write: "member-project" },
};
const DEFAULT_POLICY: Policy = { read: "member-project", write: "member-project" };

class QueryBuilder<T = Row[]> implements PromiseLike<DbResult<T>> {
  private op: Op = "select";
  private conds: Cond[] = [];
  private cols?: string[];
  private payload?: Row | Row[];
  private onConflict?: string[];
  private sort: [string, 1 | -1][] = [];
  private max?: number;
  private wantCount = false;
  private head = false;
  private returning = false;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(
    private table: string,
    private userId: string | null,
    private cache: ScopeCache,
  ) {}

  select(columns?: string, opts?: { count?: "exact"; head?: boolean }) {
    this.cols = parseColumns(columns);
    this.returning = true;
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = rows;
    this.onConflict = opts?.onConflict?.split(",").map((s) => s.trim());
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.conds.push({ col, op: "eq", val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.conds.push({ col, op: "neq", val });
    return this;
  }
  in(col: string, val: unknown[]) {
    this.conds.push({ col, op: "in", val });
    return this;
  }
  is(col: string, val: null) {
    this.conds.push({ col, op: "is", val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sort.push([field(col), opts?.ascending === false ? -1 : 1]);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this as unknown as QueryBuilder<Row>;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this as unknown as QueryBuilder<Row | null>;
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return (this.run() as Promise<DbResult<T>>).then(onfulfilled, onrejected);
  }

  private async run(): Promise<DbResult> {
    try {
      return await this.execute();
    } catch (e) {
      const err = e as { message?: string; code?: number | string };
      const dup = err.code === 11000;
      return {
        data: null,
        count: null,
        error: { message: dup ? "duplicate key value violates unique constraint" : (err.message ?? String(e)), code: dup ? "23505" : undefined },
      };
    }
  }

  private baseFilter(): Filter<Row> {
    const f: Row = {};
    for (const c of this.conds) {
      const k = field(c.col);
      const v = c.val;
      let clause: unknown;
      if (c.op === "eq") clause = v;
      else if (c.op === "neq") clause = { $ne: v };
      else if (c.op === "in") clause = { $in: v as unknown[] };
      else clause = null; // is null — Mongo `null` matches missing/null
      if (k in f) f.$and = [...(f.$and ?? []), { [k]: clause }];
      else f[k] = clause;
    }
    return f;
  }

  // ---- access control (user-scoped clients only) -------------------------
  // Memoized per client (one per request); cleared whenever projects/members are written.
  private projectIds(d: Db, kind: "member" | "owner"): Promise<string[]> {
    return (this.cache[kind] ??= this.loadProjectIds(d, kind));
  }

  private async loadProjectIds(d: Db, kind: "member" | "owner"): Promise<string[]> {
    const uid = this.userId!;
    const owned = await d.collection<Row>("projects").find({ owner_id: uid }, { projection: { _id: 1 } }).toArray();
    const ids = new Set(owned.map((p) => String(p._id)));
    if (kind === "member") {
      const mem = await d.collection<Row>("project_members").find({ user_id: uid }, { projection: { project_id: 1 } }).toArray();
      for (const m of mem) ids.add(String(m.project_id));
    }
    return [...ids];
  }

  private async scope(d: Db, access: "read" | "write"): Promise<Filter<Row> | null> {
    if (this.userId === null) return {};
    const policy = POLICIES[this.table] ?? DEFAULT_POLICY;
    const rule = policy[access as "read" | "write"] as string;
    switch (rule) {
      case "all":
        return {};
      case "none":
        return null;
      case "self-id":
        return { _id: this.userId };
      case "owner-id":
        return { owner_id: this.userId };
      case "member-id":
        return { _id: { $in: await this.projectIds(d, "member") } };
      case "member-project":
        return { project_id: { $in: await this.projectIds(d, "member") } };
      case "owner-project":
        return { project_id: { $in: await this.projectIds(d, "owner") } };
      default:
        return null;
    }
  }

  private async checkInsertAllowed(d: Db, row: Row) {
    if (this.userId === null) return;
    const rule = (POLICIES[this.table] ?? DEFAULT_POLICY).write;
    const denied = () => {
      throw new Error(`new row violates access policy for table "${this.table}"`);
    };
    if (rule === "none") denied();
    if (rule === "self-id" && row.id !== this.userId) denied();
    if (rule === "owner-id" && row.owner_id !== this.userId) denied();
    if (rule === "member-project" || rule === "owner-project") {
      const ids = await this.projectIds(d, rule === "owner-project" ? "owner" : "member");
      if (!ids.includes(row.project_id)) denied();
    }
  }

  private async execute(): Promise<DbResult> {
    const result = await this.executeOnce();
    if (this.op !== "select" && (this.table === "projects" || this.table === "project_members")) {
      this.cache.member = this.cache.owner = undefined;
    }
    return result;
  }

  private async executeOnce(): Promise<DbResult> {
    const d = await getDb();
    const col = d.collection<Row>(this.table);
    const sortSpec = this.sort.length ? Object.fromEntries(this.sort) : undefined;
    const shape = (docs: Row[]): DbResult => {
      const rows = docs.map((x) => fromDoc(x, this.cols)!);
      if (this.mode === "many") return { data: rows, error: null, count: rows.length };
      if (rows.length === 1 || (this.mode === "maybe" && rows.length <= 1))
        return { data: rows[0] ?? null, error: null };
      if (this.mode === "maybe") return { data: null, error: { message: "Multiple rows returned", code: "PGRST116" } };
      return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
    };
    const andScope = (base: Filter<Row>, scope: Filter<Row>): Filter<Row> =>
      Object.keys(scope).length ? { $and: [base, scope] } : base;

    if (this.op === "select") {
      const scope = await this.scope(d, "read");
      if (scope === null) return shape([]);
      const filter = andScope(this.baseFilter(), scope);
      if (this.head) {
        return { data: null, error: null, count: await col.countDocuments(filter) };
      }
      let cur = col.find(filter);
      if (sortSpec) cur = cur.sort(sortSpec as any);
      const lim = this.mode === "many" ? this.max : Math.min(this.max ?? 2, 2);
      if (lim) cur = cur.limit(lim);
      const docs = await cur.toArray();
      const res = shape(docs);
      if (this.wantCount) res.count = await col.countDocuments(filter);
      return res;
    }

    if (this.op === "insert" || this.op === "upsert") {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const out: Row[] = [];
      for (const raw of input) {
        const stamp = now();
        const row: Row = { ...DEFAULTS[this.table]?.(), ...raw };
        row.id ??= randomUUID();
        row.created_at ??= stamp;
        if (HAS_UPDATED_AT.has(this.table)) row.updated_at ??= stamp;
        await this.checkInsertAllowed(d, row);

        if (this.op === "insert") {
          const doc = toDoc(row);
          await col.insertOne(doc);
          out.push(doc);
          continue;
        }
        // upsert: match on onConflict columns (default: id)
        const keys = this.onConflict ?? ["id"];
        const match: Row = {};
        for (const k of keys) match[field(k)] = row[k];
        const doc = toDoc(row);
        const { _id, created_at, ...mutable } = doc;
        // Fields the caller supplied overwrite on conflict; defaults only apply on insert.
        const set: Row = {};
        for (const k of Object.keys(raw)) if (k !== "id" && k !== "created_at" && !keys.includes(k)) set[k] = raw[k];
        if (HAS_UPDATED_AT.has(this.table)) set.updated_at = stamp;
        const setOnInsert: Row = { created_at };
        for (const k of Object.keys(mutable)) if (!(k in set) && !keys.includes(k) && k !== "created_at") setOnInsert[k] = mutable[k];
        if (!keys.includes("id")) setOnInsert._id = _id;
        const existing = await col.findOne(match);
        if (existing) {
          const scope = await this.scope(d, "write");
          if (scope === null) throw new Error(`access denied for table "${this.table}"`);
          const ok = await col.findOne(andScope({ _id: existing._id }, scope));
          if (!ok) throw new Error(`new row violates access policy for table "${this.table}"`);
        }
        const update: Row = { $setOnInsert: setOnInsert };
        if (Object.keys(set).length) update.$set = set;
        const res = await col.findOneAndUpdate(match, update, { upsert: true, returnDocument: "after" });
        if (res) out.push(res);
      }
      return this.returning ? shape(out) : { data: null, error: null };
    }

    // update / delete
    const scope = await this.scope(d, "write");
    if (scope === null) {
      // No permission: behaves like RLS — matches zero rows.
      return this.returning ? shape([]) : { data: null, error: null };
    }
    const filter = andScope(this.baseFilter(), scope);

    if (this.op === "update") {
      const patch = { ...(this.payload as Row) };
      delete patch.id;
      if (HAS_UPDATED_AT.has(this.table)) patch.updated_at = now();
      const targets = await col.find(filter, { projection: { _id: 1 } }).toArray();
      const ids = targets.map((t) => t._id);
      if (ids.length) await col.updateMany({ _id: { $in: ids } }, { $set: patch });
      if (!this.returning) return { data: null, error: null };
      const docs = ids.length ? await col.find({ _id: { $in: ids } }).toArray() : [];
      return shape(docs);
    }

    // delete (with the cascades Postgres foreign keys used to provide)
    const targets = await col.find(filter).toArray();
    const ids = targets.map((t) => t._id as unknown as string);
    if (ids.length) {
      await col.deleteMany({ _id: { $in: ids } });
      await cascade(d, this.table, ids);
    }
    return this.returning ? shape(targets) : { data: null, error: null };
  }
}

async function cascade(d: Db, table: string, ids: string[]): Promise<void> {
  if (table === "projects") {
    for (const child of PROJECT_CHILDREN) await d.collection(child).deleteMany({ project_id: { $in: ids } });
  } else if (table === "repositories") {
    const scans = await d.collection<Row>("repository_scans").find({ repository_id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
    const scanIds = scans.map((s) => s._id as unknown as string);
    await d.collection<Row>("repository_scans").deleteMany({ repository_id: { $in: ids } });
    if (scanIds.length) await d.collection<Row>("reality_models").deleteMany({ scan_id: { $in: scanIds } });
  } else if (table === "docs") {
    const kids = await d.collection<Row>("docs").find({ parent_id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
    const kidIds = kids.map((k) => k._id as unknown as string);
    if (kidIds.length) {
      await d.collection<Row>("docs").deleteMany({ _id: { $in: kidIds } });
      await cascade(d, "docs", kidIds);
    }
  }
}

export type DbClient = { from: (table: string) => QueryBuilder };

function makeClient(userId: string | null): DbClient {
  const cache: ScopeCache = {};
  return { from: (table) => new QueryBuilder(table, userId, cache) };
}

/** Unscoped client. Server-only, trusted code paths (webhooks, seeding, API-token routes). */
export const db: DbClient = makeClient(null);

/** Client that enforces per-user access, replacing Postgres RLS. */
export function createUserDb(userId: string): DbClient {
  return makeClient(userId);
}

// ---- users (replaces Supabase Auth) ---------------------------------------
export type UserRecord = { id: string; email: string; password_hash: string; created_at: string };

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const d = await getDb();
  return fromDoc(await d.collection<Row>("users").findOne({ email: email.toLowerCase() })) as UserRecord | null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const d = await getDb();
  return fromDoc(await d.collection<Row>("users").findOne({ _id: id as any })) as UserRecord | null;
}

export async function insertUser(email: string, passwordHash: string): Promise<UserRecord> {
  const d = await getDb();
  const user = { id: randomUUID(), email: email.toLowerCase(), password_hash: passwordHash, created_at: now() };
  await d.collection<Row>("users").insertOne(toDoc(user));
  return user;
}

export async function setUserPassword(id: string, passwordHash: string): Promise<void> {
  const d = await getDb();
  await d.collection<Row>("users").updateOne({ _id: id as any }, { $set: { password_hash: passwordHash } });
}
