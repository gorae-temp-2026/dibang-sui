drop extension if exists "pg_net";

drop policy "host reads wedding participations" on "public"."guest_participations";

alter table "public"."channels" drop constraint "unique_wedding_side";

alter table "public"."channels" drop constraint "channels_wedding_id_fkey";

alter table "public"."photos" drop constraint "photos_wedding_id_fkey";

alter table "public"."tickets" drop constraint "tickets_wedding_id_fkey";

drop index if exists "public"."unique_wedding_side";


  create table "public"."photo_comments" (
    "id" uuid not null default gen_random_uuid(),
    "photo_id" uuid not null,
    "wedding_id" uuid not null,
    "guest_name" text not null,
    "guest_affiliation" text,
    "text" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."photo_comments" enable row level security;


  create table "public"."photo_likes" (
    "id" uuid not null default gen_random_uuid(),
    "photo_id" uuid not null,
    "wedding_id" uuid not null,
    "guest_name" text not null,
    "guest_affiliation" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."photo_likes" enable row level security;

alter table "public"."channels" add column "toss_id" text;

alter table "public"."photos" add column "is_private" boolean default false;

CREATE INDEX photo_comments_photo_id_idx ON public.photo_comments USING btree (photo_id);

CREATE UNIQUE INDEX photo_comments_pkey ON public.photo_comments USING btree (id);

CREATE INDEX photo_comments_wedding_id_idx ON public.photo_comments USING btree (wedding_id);

CREATE UNIQUE INDEX photo_likes_photo_id_guest_name_key ON public.photo_likes USING btree (photo_id, guest_name);

CREATE INDEX photo_likes_photo_id_idx ON public.photo_likes USING btree (photo_id);

CREATE UNIQUE INDEX photo_likes_pkey ON public.photo_likes USING btree (id);

CREATE INDEX photo_likes_wedding_id_idx ON public.photo_likes USING btree (wedding_id);

CREATE INDEX photos_uploaded_at_idx ON public.photos USING btree (uploaded_at DESC);

CREATE INDEX photos_wedding_id_idx ON public.photos USING btree (wedding_id);

CREATE UNIQUE INDEX tickets_cash_gift_ticket_no_unique ON public.tickets USING btree (cash_gift_id, ticket_no);

alter table "public"."photo_comments" add constraint "photo_comments_pkey" PRIMARY KEY using index "photo_comments_pkey";

alter table "public"."photo_likes" add constraint "photo_likes_pkey" PRIMARY KEY using index "photo_likes_pkey";

alter table "public"."photo_comments" add constraint "photo_comments_photo_id_fkey" FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE not valid;

alter table "public"."photo_comments" validate constraint "photo_comments_photo_id_fkey";

alter table "public"."photo_comments" add constraint "photo_comments_text_check" CHECK ((char_length(text) <= 200)) not valid;

alter table "public"."photo_comments" validate constraint "photo_comments_text_check";

alter table "public"."photo_comments" add constraint "photo_comments_wedding_id_fkey" FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE not valid;

alter table "public"."photo_comments" validate constraint "photo_comments_wedding_id_fkey";

alter table "public"."photo_likes" add constraint "photo_likes_photo_id_fkey" FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE not valid;

alter table "public"."photo_likes" validate constraint "photo_likes_photo_id_fkey";

alter table "public"."photo_likes" add constraint "photo_likes_photo_id_guest_name_key" UNIQUE using index "photo_likes_photo_id_guest_name_key";

alter table "public"."photo_likes" add constraint "photo_likes_wedding_id_fkey" FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE not valid;

alter table "public"."photo_likes" validate constraint "photo_likes_wedding_id_fkey";

alter table "public"."tickets" add constraint "tickets_cash_gift_ticket_no_unique" UNIQUE using index "tickets_cash_gift_ticket_no_unique";

alter table "public"."channels" add constraint "channels_wedding_id_fkey" FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE not valid;

alter table "public"."channels" validate constraint "channels_wedding_id_fkey";

alter table "public"."photos" add constraint "photos_wedding_id_fkey" FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE not valid;

alter table "public"."photos" validate constraint "photos_wedding_id_fkey";

alter table "public"."tickets" add constraint "tickets_wedding_id_fkey" FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_wedding_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_participated_wedding_ids(uid uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select wedding_id from guest_participations where user_id = uid
  $function$
;

grant delete on table "public"."photo_comments" to "anon";

grant insert on table "public"."photo_comments" to "anon";

grant references on table "public"."photo_comments" to "anon";

grant select on table "public"."photo_comments" to "anon";

grant trigger on table "public"."photo_comments" to "anon";

grant truncate on table "public"."photo_comments" to "anon";

grant update on table "public"."photo_comments" to "anon";

grant delete on table "public"."photo_comments" to "authenticated";

grant insert on table "public"."photo_comments" to "authenticated";

grant references on table "public"."photo_comments" to "authenticated";

grant select on table "public"."photo_comments" to "authenticated";

grant trigger on table "public"."photo_comments" to "authenticated";

grant truncate on table "public"."photo_comments" to "authenticated";

grant update on table "public"."photo_comments" to "authenticated";

grant delete on table "public"."photo_comments" to "service_role";

grant insert on table "public"."photo_comments" to "service_role";

grant references on table "public"."photo_comments" to "service_role";

grant select on table "public"."photo_comments" to "service_role";

grant trigger on table "public"."photo_comments" to "service_role";

grant truncate on table "public"."photo_comments" to "service_role";

grant update on table "public"."photo_comments" to "service_role";

grant delete on table "public"."photo_likes" to "anon";

grant insert on table "public"."photo_likes" to "anon";

grant references on table "public"."photo_likes" to "anon";

grant select on table "public"."photo_likes" to "anon";

grant trigger on table "public"."photo_likes" to "anon";

grant truncate on table "public"."photo_likes" to "anon";

grant update on table "public"."photo_likes" to "anon";

grant delete on table "public"."photo_likes" to "authenticated";

grant insert on table "public"."photo_likes" to "authenticated";

grant references on table "public"."photo_likes" to "authenticated";

grant select on table "public"."photo_likes" to "authenticated";

grant trigger on table "public"."photo_likes" to "authenticated";

grant truncate on table "public"."photo_likes" to "authenticated";

grant update on table "public"."photo_likes" to "authenticated";

grant delete on table "public"."photo_likes" to "service_role";

grant insert on table "public"."photo_likes" to "service_role";

grant references on table "public"."photo_likes" to "service_role";

grant select on table "public"."photo_likes" to "service_role";

grant trigger on table "public"."photo_likes" to "service_role";

grant truncate on table "public"."photo_likes" to "service_role";

grant update on table "public"."photo_likes" to "service_role";


  create policy "channels_public_read"
  on "public"."channels"
  as permissive
  for select
  to public
using (true);



  create policy "photo_comments_insert_anon"
  on "public"."photo_comments"
  as permissive
  for insert
  to public
with check (true);



  create policy "photo_comments_select_anon"
  on "public"."photo_comments"
  as permissive
  for select
  to public
using (true);



  create policy "photo_likes_delete_anon"
  on "public"."photo_likes"
  as permissive
  for delete
  to public
using (true);



  create policy "photo_likes_insert_anon"
  on "public"."photo_likes"
  as permissive
  for insert
  to public
with check (true);



  create policy "photo_likes_select_anon"
  on "public"."photo_likes"
  as permissive
  for select
  to public
using (true);



  create policy "photos_guest_insert"
  on "public"."photos"
  as permissive
  for insert
  to public
with check (true);



  create policy "photos_insert_anon"
  on "public"."photos"
  as permissive
  for insert
  to public
with check (true);



  create policy "photos_public_read"
  on "public"."photos"
  as permissive
  for select
  to public
using ((is_private = false));



  create policy "photos_select_anon"
  on "public"."photos"
  as permissive
  for select
  to public
using (true);



  create policy "photos_update_host"
  on "public"."photos"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.weddings
  WHERE ((weddings.id = photos.wedding_id) AND (weddings.host_id = auth.uid())))));



  create policy "guest reads participated weddings"
  on "public"."weddings"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT public.get_user_participated_wedding_ids(auth.uid()) AS get_user_participated_wedding_ids)));



  create policy "storage_photos_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'wedding-photos'::text) AND (auth.uid() IS NOT NULL)));



  create policy "storage_photos_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'wedding-photos'::text));



  create policy "storage_photos_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'wedding-photos'::text));



  create policy "wedding_photos_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'wedding-photos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "wedding_photos_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'wedding-photos'::text));



  create policy "wedding_photos_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'wedding-photos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "wedding_photos_upload"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'wedding-photos'::text));



