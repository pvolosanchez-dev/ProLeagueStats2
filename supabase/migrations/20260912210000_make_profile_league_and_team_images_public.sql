-- Keep all user-facing images permanently readable from the public app.
-- Uploads remain restricted to authenticated users by the existing INSERT policies.

update storage.buckets
set public = true
where id in ('avatars', 'team-logos');

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_read_profile_and_team_images'
  ) then
    create policy "public_read_profile_and_team_images"
      on storage.objects
      for select
      to public
      using (bucket_id in ('avatars', 'team-logos'));
  end if;
end $$;
