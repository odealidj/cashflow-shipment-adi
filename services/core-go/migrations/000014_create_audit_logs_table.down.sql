-- Rollback Migration 000014: Consolidated Executive Audit Logs

DROP TABLE IF EXISTS audit_logs;
DROP TYPE IF EXISTS audit_action;
DROP TYPE IF EXISTS audit_severity;

DELETE FROM permissions WHERE module = 'AUDIT';
