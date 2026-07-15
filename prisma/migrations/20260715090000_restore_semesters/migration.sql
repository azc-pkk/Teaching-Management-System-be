-- Restore the semester master data removed by the strict image-schema migration.
CREATE TABLE `semester` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'PLANNED',

    UNIQUE INDEX `semester_code_key`(`code`),
    INDEX `semester_start_date_idx`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing business rows use semester_id = 1, so preserve that identifier.
INSERT INTO `semester` (`id`, `code`, `name`, `start_date`, `end_date`, `status`) VALUES
    (1, '2025-2026-2', '2025-2026学年第二学期', '2026-02-23', '2026-07-17', 'ACTIVE'),
    (2, '2025-2026-1', '2025-2026学年第一学期', '2025-09-01', '2026-01-23', 'CLOSED'),
    (3, '2024-2025-2', '2024-2025学年第二学期', '2025-02-24', '2025-07-18', 'CLOSED'),
    (4, '2026-2027-1', '2026-2027学年第一学期', '2026-09-01', '2027-01-22', 'PLANNED');

ALTER TABLE `exam`
    ADD CONSTRAINT `exam_semester_id_fkey`
    FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `textbook_order`
    ADD CONSTRAINT `textbook_order_semester_id_fkey`
    FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `graduation_review`
    ADD CONSTRAINT `graduation_review_semester_id_fkey`
    FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
