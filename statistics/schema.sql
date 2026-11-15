-- Only the Edge Function's service role can access raw records or these RPCs.
create table public.tutu_counts (
  key text primary key,
  total bigint not null default 0 check (total >= 0),
  started_at timestamptz not null default now()
);
insert into public.tutu_counts(key) values ('visitors');
create table public.tutu_visitors (
  visitor_hash text primary key check (visitor_hash ~ '^[a-f0-9]{64}$')
);
create table public.tutu_download_receipts (
  event_id uuid primary key,
  visitor_hash text not null,
  book_id text not null,
  created_at timestamptz not null default now()
);
create index tutu_download_recent on public.tutu_download_receipts(visitor_hash,book_id,created_at desc);
create index tutu_download_expiry on public.tutu_download_receipts(created_at);
alter table public.tutu_counts enable row level security;
alter table public.tutu_visitors enable row level security;
alter table public.tutu_download_receipts enable row level security;
revoke all on public.tutu_counts,public.tutu_visitors,public.tutu_download_receipts from public,anon,authenticated;
grant select,insert,update,delete on public.tutu_counts,public.tutu_visitors,public.tutu_download_receipts to service_role;

create function public.tutu_statistics() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'visitors',coalesce((select total from public.tutu_counts where key='visitors'),0),
  'downloads',coalesce((select jsonb_object_agg(substr(key,10),total) from public.tutu_counts where key like 'download:%'),'{}'::jsonb),
  'since',(select started_at from public.tutu_counts where key='visitors')
 );
$$;
revoke all on function public.tutu_statistics() from public,anon,authenticated;
grant execute on function public.tutu_statistics() to service_role;

create function public.tutu_record_event(p_kind text,p_visitor_hash text,p_book_id text default '',p_event_id uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare inserted boolean;
begin
 if p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid visitor';end if;
 if p_kind='visit' then
  insert into public.tutu_visitors(visitor_hash) values (p_visitor_hash) on conflict do nothing;
  inserted := found;
  if inserted then update public.tutu_counts set total=total+1 where key='visitors';end if;
 elsif p_kind='download' then
  if p_event_id is null or p_book_id is null or p_book_id !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'Invalid download';end if;
  -- Serialize a browser/book pair so a double tap or simultaneous tabs count once.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visitor_hash||':'||p_book_id,0));
  if not exists(select 1 from public.tutu_download_receipts where visitor_hash=p_visitor_hash and book_id=p_book_id and created_at>now()-interval '10 seconds') then
   insert into public.tutu_download_receipts(event_id,visitor_hash,book_id) values (p_event_id,p_visitor_hash,p_book_id) on conflict do nothing;
   inserted := found;
   if inserted then
    insert into public.tutu_counts(key,total) values ('download:'||p_book_id,1) on conflict(key) do update set total=public.tutu_counts.total+1;
   end if;
  end if;
  delete from public.tutu_download_receipts where created_at<now()-interval '1 day';
 else raise exception 'Invalid event';end if;
 return public.tutu_statistics();
end;
$$;
revoke all on function public.tutu_record_event(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.tutu_record_event(text,text,text,uuid) to service_role;
