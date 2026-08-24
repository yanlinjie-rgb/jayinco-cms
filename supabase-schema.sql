-- ============================================================
--  JAYINCO 后台 CMS — Supabase 数据库结构
--  在 Supabase 控制台的 SQL Editor 中完整执行本文件
-- ============================================================

-- ═══ 1. 产品表 products ═══
create table if not exists public.products (
  id              uuid        primary key default gen_random_uuid(),
  category        text        not null default 'wire-to-board',
  name_zh         text        not null default '',
  name_en         text        not null default '',
  spec            text        default '',
  model           text        default '',
  packaging       text        default '',
  description_zh  text        default '',
  description_en  text        default '',
  image_url       text        default '',
  pdf_url         text        default '',
  basic_info_zh   text        default '',   -- 富文本(HTML)，基本说明
  basic_info_en   text        default '',
  molde_code      jsonb       default '[]'::jsonb,  -- 数组: {no,code,spec,pdf,model3d}
  dimensions_img  text        default '',   -- 尺寸图 URL
  product_desc_zh text        default '',   -- 产品说明(富文本)
  product_desc_en text        default '',
  related         jsonb       default '[]'::jsonb,  -- 关联产品 id 数组
  sort_order      int         default 0,
  created_at      timestamptz default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_sort_idx     on public.products (sort_order);

-- ═══ 2. 文章表 articles ═══
create table if not exists public.articles (
  id            uuid        primary key default gen_random_uuid(),
  title_zh      text        not null default '',
  title_en      text        not null default '',
  body_zh       text        default '',   -- 富文本(HTML)
  body_en       text        default '',
  cover_image   text        default '',
  published     boolean     default true,
  published_at  timestamptz default now(),
  created_at    timestamptz default now()
);

create index if not exists articles_published_idx on public.articles (published, published_at desc);

-- ═══ 3. 站点内容表 site_content（页面装修：文本/图片） ═══
create table if not exists public.site_content (
  key         text        primary key,        -- 例如 hero_products_title
  type        text        not null default 'text',  -- 'text' | 'image'
  value_zh    text        default '',
  value_en    text        default '',
  updated_at  timestamptz default now()
);

-- ============================================================
--  RLS 行级安全策略
--  公开可读；仅"已登录用户"可写（后台管理员）
-- ============================================================
alter table public.products      enable row level security;
alter table public.articles      enable row level security;
alter table public.site_content  enable row level security;

-- products
drop policy if exists "public read products" on public.products;
create policy "public read products"
  on public.products for select using (true);
drop policy if exists "auth write products" on public.products;
create policy "auth write products"
  on public.products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- articles
drop policy if exists "public read articles" on public.articles;
create policy "public read articles"
  on public.articles for select using (true);
drop policy if exists "auth write articles" on public.articles;
create policy "auth write articles"
  on public.articles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- site_content
drop policy if exists "public read site_content" on public.site_content;
create policy "public read site_content"
  on public.site_content for select using (true);
drop policy if exists "auth write site_content" on public.site_content;
create policy "auth write site_content"
  on public.site_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
--  存储桶 cms-images（产品图 / 文章封面 / 页面装修图）
--  公开读，登录后可写
-- ============================================================
insert into storage.buckets (id, name, public)
values ('cms-images', 'cms-images', true)
on conflict (id) do nothing;

drop policy if exists "public read cms-images" on storage.objects;
create policy "public read cms-images"
  on storage.objects for select
  using (bucket_id = 'cms-images');

drop policy if exists "auth upload cms-images" on storage.objects;
create policy "auth upload cms-images"
  on storage.objects for insert
  with check (bucket_id = 'cms-images' and auth.role() = 'authenticated');

drop policy if exists "auth update cms-images" on storage.objects;
create policy "auth update cms-images"
  on storage.objects for update
  using (bucket_id = 'cms-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'cms-images' and auth.role() = 'authenticated');

drop policy if exists "auth delete cms-images" on storage.objects;
create policy "auth delete cms-images"
  on storage.objects for delete
  using (bucket_id = 'cms-images' and auth.role() = 'authenticated');

-- ============================================================
--  可选：预置常用页面装修 key（后台"页面装修"里也能手动加）
-- ============================================================
insert into public.site_content (key, type, value_zh, value_en) values
  ('hero_products_title', 'text', '全面的连接器产品矩阵', 'Comprehensive Connector Portfolio'),
  ('hero_products_sub',   'text', '从标准互连到汽车级高可靠方案，覆盖各类应用场景。', 'From standard interconnection to automotive-grade reliability.'),
  ('banner_products',     'image', '', ''),
  ('banner_about',        'image', '', ''),
  ('banner_news',         'image', '', ''),
  ('banner_contact',      'image', '', '')
on conflict (key) do nothing;
