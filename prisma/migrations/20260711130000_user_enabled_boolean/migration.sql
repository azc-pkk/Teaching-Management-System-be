-- Add the boolean replacement with a safe default for new rows.
ALTER TABLE `sys_user`
    ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT TRUE;

-- Preserve the existing account state before removing the enum column.
UPDATE `sys_user`
SET `enabled` = CASE
    WHEN `status` = 'ENABLED' THEN TRUE
    ELSE FALSE
END;

-- The boolean column is now the single source of truth.
ALTER TABLE `sys_user`
    DROP COLUMN `status`;
