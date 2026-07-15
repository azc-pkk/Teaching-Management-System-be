-- CreateTable
CREATE TABLE `semester` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'PLANNED',

    UNIQUE INDEX `semester_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill the real semester used by the existing seed data before foreign keys are restored.
INSERT INTO `semester` (`id`, `code`, `name`, `start_date`, `end_date`, `status`)
VALUES (1, '2025-2026-2', '2025-2026学年第二学期', '2026-02-23', '2026-07-31', 'ACTIVE');

-- Preserve any non-seed legacy semester numbers so existing local rows do not block the migration.
INSERT INTO `semester` (`id`, `code`, `name`, `start_date`, `end_date`, `status`)
SELECT
    `legacy_semesters`.`id`,
    CONCAT('LEGACY-', `legacy_semesters`.`id`),
    CONCAT('历史学期 ', `legacy_semesters`.`id`),
    '2000-01-01',
    '2099-12-31',
    'CLOSED'
FROM (
    SELECT `semester_id` AS `id` FROM `exam` WHERE `semester_id` <> 1
    UNION
    SELECT `semester_id` AS `id` FROM `textbook_order` WHERE `semester_id` <> 1
    UNION
    SELECT `semester_id` AS `id` FROM `graduation_review` WHERE `semester_id` <> 1
) AS `legacy_semesters`;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_semester_id_fkey`
FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_semester_id_fkey`
FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graduation_review` ADD CONSTRAINT `graduation_review_semester_id_fkey`
FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
