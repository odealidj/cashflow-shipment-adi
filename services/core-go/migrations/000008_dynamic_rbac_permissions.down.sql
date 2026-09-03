-- Rollback Migrasi 000008: Dynamic Fine-Grained Role & Permission Based Access Control (PBAC)

ALTER TABLE users DROP COLUMN IF EXISTS role_id;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
