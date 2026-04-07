-- Secure Auth Schema Migration
-- Adds proper indexes for O(log n) lookups on the users table
-- Run this after `algotube.sql` to upgrade the authentication layer

USE algotube;

-- Ensure email column has a UNIQUE INDEX for O(log n) B-tree lookups
-- This makes login queries nearly instantaneous even at scale
ALTER TABLE users
    MODIFY COLUMN email VARCHAR(100) NOT NULL,
    ADD UNIQUE INDEX idx_users_email (email),
    ADD INDEX idx_users_username (username);

-- Verify the indexes are in place
SHOW INDEX FROM users;
