-- Both Subscriber and SubscriberEmail models declare `useUuid: true`
-- but the original create-table migrations didn't add the column,
-- which leaves Subscriber.create() throwing
--   "table subscribers has no column named uuid"
-- on every signup. Add the column to both tables; existing rows
-- get a NULL uuid which the ORM treats as "not yet stamped" and
-- a future write can fill in.
ALTER TABLE "subscribers" ADD COLUMN "uuid" TEXT;
ALTER TABLE "subscriber_emails" ADD COLUMN "uuid" TEXT;
