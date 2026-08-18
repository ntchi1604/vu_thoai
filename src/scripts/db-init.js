// Tạo schema thư viện ký hiệu trong Supabase nếu chưa có.
// Chạy: npm run db:init (cần DATABASE_URL trong .env)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ENV_PATH = resolve('.env')

function loadEnv() {
  if (!process.env.DATABASE_URL) {
    try {
      const content = readFileSync(ENV_PATH, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
      }
    } catch {
      // không có .env → rơi xuống báo lỗi phía dưới
    }
  }
}

const SCHEMA = `
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  phrase text not null default '',
  hand_count smallint not null check (hand_count in (1, 2)),
  frames jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists templates_user_label_idx on public.templates (user_id, label);

alter table public.templates enable row level security;

-- Postgres không có "create policy if not exists" → drop rồi tạo lại
drop policy if exists "templates_select_own" on public.templates;
create policy "templates_select_own" on public.templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own" on public.templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own" on public.templates
  for delete using (auth.uid() = user_id);
`

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('Thiếu DATABASE_URL. Thêm vào .env (Project Settings → Database → Connection string → URI).')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

try {
  await client.connect()
  await client.query(SCHEMA)
  console.log('OK: schema templates đã sẵn sàng (bảng + index + RLS).')
} finally {
  await client.end()
}
