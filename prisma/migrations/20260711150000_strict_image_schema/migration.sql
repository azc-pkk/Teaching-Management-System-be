-- DropForeignKey
ALTER TABLE `exam` DROP FOREIGN KEY `exam_semester_id_fkey`;

-- DropForeignKey
ALTER TABLE `graduation_review` DROP FOREIGN KEY `graduation_review_semester_id_fkey`;

-- DropForeignKey
ALTER TABLE `textbook_order` DROP FOREIGN KEY `textbook_order_semester_id_fkey`;

-- AlterTable
ALTER TABLE `class_group` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `classroom` DROP COLUMN `created_at`,
    DROP COLUMN `room_name`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `classroom_request` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `course` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `department` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `exam` DROP COLUMN `created_at`,
    DROP COLUMN `status`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `graduation_review` DROP COLUMN `created_at`,
    DROP COLUMN `reason`,
    DROP COLUMN `reviewed_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `major` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `schedule_change` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `student` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `sys_user` DROP COLUMN `created_at`,
    DROP COLUMN `email`,
    DROP COLUMN `phone`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `teacher` DROP COLUMN `created_at`,
    DROP COLUMN `email`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `teaching_log` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `textbook` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- AlterTable
ALTER TABLE `textbook_order` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;

-- DropTable
DROP TABLE `semester`;
