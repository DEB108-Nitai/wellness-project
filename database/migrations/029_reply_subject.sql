-- The admin writes the subject of each reply (owner, 2026-10-22); it is kept with the reply.
-- Replies sent before this were all "Re: <their subject>" and keep NULL here.
ALTER TABLE contact_message_replies ADD COLUMN subject VARCHAR(200) NULL AFTER admin_id;
