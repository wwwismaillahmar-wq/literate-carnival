begin;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
on public.conversations for select to authenticated
using (
  (select auth.uid()) in (participant_a, participant_b)
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(participant_a, participant_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(participant_a, participant_b)
  )
);

drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_update_participant
on public.conversations for update to authenticated
using (
  (select auth.uid()) in (participant_a, participant_b)
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(participant_a, participant_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(participant_a, participant_b)
  )
)
with check (
  (select auth.uid()) in (participant_a, participant_b)
);

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_a, c.participant_b)
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and least(f.requester_id, f.addressee_id) = least(c.participant_a, c.participant_b)
          and greatest(f.requester_id, f.addressee_id) = greatest(c.participant_a, c.participant_b)
      )
  )
);

commit;
