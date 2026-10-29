-- Run as the owner of public.users. Existing accounts and data are preserved.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('National Command Center Admin','District Disaster Officer','Field Responder','Citizen','CHW'));
