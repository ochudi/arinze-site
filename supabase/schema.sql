-- arinze-nwokolo.com
--
-- Run once in the Supabase SQL editor. Every object is prefixed arinze_ so the
-- site can share a project with others. Row level security is on and no
-- policies are defined: nothing is readable or writable with the public key.
-- Only the server reads and writes these tables, with the secret key.

create table arinze_profile (
  id           boolean primary key default true check (id), -- one row only
  name         text not null,
  role         text not null default '',
  institution  text not null default '',
  university   text not null default '',
  lede         text not null default '',
  bio          text not null default '',
  email        text not null default '',
  portrait     text,                        -- path in the arinze-site bucket
  cv           text,                        -- path in the arinze-site bucket
  affiliations jsonb not null default '[]', -- [{ "name", "url" }]
  links        jsonb not null default '[]', -- [{ "label", "url" }]
  updated_at   timestamptz not null default now() -- last change to anything
);

create table arinze_papers (
  slug      text primary key,
  title     text not null,
  section   text not null
            check (section in ('publications', 'working-papers', 'in-progress')),
  year      text not null default '' check (year ~ '^(\d{4})?$'),
  coauthors jsonb not null default '[]',    -- [{ "name", "url" }]
  venue     text not null default '',
  citation  text not null default '',
  status    text not null default '',
  abstract  text not null default '',
  pdf       text,                           -- path in the arinze-site bucket
  url       text,
  doi       text not null default '',
  links     jsonb not null default '[]',    -- [{ "label", "url" }]
  selected  boolean not null default false
);

create table arinze_media (
  slug   text primary key,
  title  text not null,
  kind   text not null
         check (kind in ('podcast', 'interview', 'article', 'talk')),
  outlet text not null default '',
  date   date,
  url    text not null,
  audio  text
);

create table arinze_writing (
  slug     text primary key,
  title    text not null,
  date     date not null,
  summary  text not null default '',
  outlet   text not null default '',
  external text,                            -- set when the piece lives elsewhere
  body     text not null default '',        -- Markdown
  draft    boolean not null default false   -- saved but not on the site
);

-- How often each paper was opened from the site, by day. No visitor data.
create table arinze_opens (
  paper text not null
        references arinze_papers (slug) on update cascade on delete cascade,
  day   date not null default current_date,
  count integer not null default 1,
  primary key (paper, day)
);

create function arinze_count_open(paper_slug text) returns void
language sql set search_path = public as $$
  insert into arinze_opens (paper) values (paper_slug)
  on conflict (paper, day) do update set count = arinze_opens.count + 1;
$$;

-- The same counts added up for the editor's Readers table.
create function arinze_readers()
returns table (paper text, total bigint, recent bigint)
language sql stable set search_path = public as $$
  select o.paper,
         sum(o.count)::bigint,
         coalesce(sum(o.count) filter (where o.day > current_date - 30), 0)::bigint
  from arinze_opens o
  group by o.paper;
$$;

-- Who may sign in to /admin. Accounts live in Supabase Auth, which the whole
-- project shares; this list is what makes one of them an editor of this site.
create table arinze_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email   text not null
);

alter table arinze_profile enable row level security;
alter table arinze_papers  enable row level security;
alter table arinze_media   enable row level security;
alter table arinze_writing enable row level security;
alter table arinze_opens   enable row level security;
alter table arinze_admins  enable row level security;

revoke all on arinze_profile, arinze_papers, arinze_media, arinze_writing,
  arinze_opens, arinze_admins from anon, authenticated;
grant all on arinze_profile, arinze_papers, arinze_media, arinze_writing,
  arinze_opens, arinze_admins to service_role;

revoke execute on function arinze_count_open(text), arinze_readers()
  from public, anon, authenticated;
grant execute on function arinze_count_open(text), arinze_readers()
  to service_role;
