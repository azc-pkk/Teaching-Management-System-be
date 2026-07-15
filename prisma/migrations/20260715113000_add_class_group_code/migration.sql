-- Add a stable class code so class groups do not depend on auto-increment IDs.
ALTER TABLE `class_group`
    ADD COLUMN `class_code` VARCHAR(10) NULL;

-- Existing groups are numbered in creation order within each grade and major.
UPDATE `class_group` AS `target`
JOIN (
    SELECT
        `id`,
        LPAD(
            ROW_NUMBER() OVER (
                PARTITION BY `grade`, `major_id`
                ORDER BY `id`
            ),
            2,
            '0'
        ) AS `generated_code`
    FROM `class_group`
) AS `ranked` ON `ranked`.`id` = `target`.`id`
SET `target`.`class_code` = `ranked`.`generated_code`;

ALTER TABLE `class_group`
    MODIFY `class_code` VARCHAR(10) NOT NULL;

CREATE UNIQUE INDEX `class_group_grade_major_id_class_code_key`
    ON `class_group`(`grade`, `major_id`, `class_code`);
