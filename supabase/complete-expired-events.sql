-- OrgHub: automatically mark expired events as completed.
-- Run this once in Supabase Dashboard > SQL Editor.
--
-- Cancelled events are deliberately preserved. Events without ends_at are
-- not auto-completed because their end time is unknown.

create extension if not exists pg_cron with schema pg_catalog;

-- Immediately correct any events that have already passed their end time.
update public.events
set status = 'completed'
where ends_at is not null
  and ends_at <= now()
  and lower(coalesce(status, '')) not in ('completed', 'cancelled');

-- Replace the named job if this script is run again, then schedule it every
-- five minutes. The database job runs even when nobody has the website open.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'orghub-complete-expired-events';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'orghub-complete-expired-events',
    '*/5 * * * *',
    $job$
      update public.events
      set status = 'completed'
      where ends_at is not null
        and ends_at <= now()
        and lower(coalesce(status, '')) not in ('completed', 'cancelled');
    $job$
  );
end
$$;

-- Verify that the scheduled job exists:
select jobid, jobname, schedule, command
from cron.job
where jobname = 'orghub-complete-expired-events';
