/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `classroom` ADD COLUMN `area` DECIMAL(8, 2) NULL,
    ADD COLUMN `manager_name` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `course` ADD COLUMN `assessment_method` VARCHAR(50) NULL,
    ADD COLUMN `office_id` INTEGER NULL,
    ADD COLUMN `participate_makeup` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `total_hours` INTEGER NULL;

-- AlterTable
ALTER TABLE `sys_user` MODIFY `role` ENUM('ADMIN', 'ACADEMIC', 'TEACHER', 'STUDENT', 'LEADER') NOT NULL;

-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `office_id` INTEGER NULL,
    ADD COLUMN `user_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `teaching_office` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `office_code` VARCHAR(30) NOT NULL,
    `office_name` VARCHAR(100) NOT NULL,
    `director_name` VARCHAR(50) NULL,
    `department` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teaching_office_office_code_key`(`office_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `major` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `major_code` VARCHAR(30) NOT NULL,
    `major_name` VARCHAR(100) NOT NULL,
    `department_name` VARCHAR(100) NULL,
    `degree_type` VARCHAR(30) NULL,
    `duration_years` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `major_major_code_key`(`major_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_class` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_code` VARCHAR(30) NOT NULL,
    `class_name` VARCHAR(100) NOT NULL,
    `grade_year` INTEGER NOT NULL,
    `campus` VARCHAR(100) NULL,
    `counselor_name` VARCHAR(50) NULL,
    `student_count` INTEGER NOT NULL DEFAULT 0,
    `major_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_class_class_code_key`(`class_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_no` VARCHAR(30) NOT NULL,
    `student_name` VARCHAR(50) NOT NULL,
    `gender` VARCHAR(10) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `admission_year` INTEGER NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    `class_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_student_no_key`(`student_no`),
    UNIQUE INDEX `student_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_schedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester` VARCHAR(30) NOT NULL,
    `week_info` VARCHAR(100) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `start_section` INTEGER NOT NULL,
    `end_section` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NOT NULL,
    `class_id` INTEGER NOT NULL,
    `classroom_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `teaching_schedule_semester_idx`(`semester`),
    INDEX `teaching_schedule_teacher_id_weekday_idx`(`teacher_id`, `weekday`),
    INDEX `teaching_schedule_classroom_id_weekday_idx`(`classroom_id`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classroom_application` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purpose` VARCHAR(255) NOT NULL,
    `use_date` DATE NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `comment` VARCHAR(255) NULL,
    `applicant_id` INTEGER NOT NULL,
    `classroom_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `classroom_application_classroom_id_use_date_idx`(`classroom_id`, `use_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_adjustment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `original_date` DATE NOT NULL,
    `new_date` DATE NOT NULL,
    `adjusted_hours` INTEGER NOT NULL DEFAULT 0,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `department_note` VARCHAR(255) NULL,
    `academic_note` VARCHAR(255) NULL,
    `leader_note` VARCHAR(255) NULL,
    `schedule_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NOT NULL,
    `new_classroom_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_code` VARCHAR(30) NOT NULL,
    `exam_type` ENUM('FINAL', 'MAKEUP', 'RETAKE') NOT NULL,
    `exam_date` DATE NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `expected_count` INTEGER NOT NULL DEFAULT 0,
    `actual_count` INTEGER NOT NULL DEFAULT 0,
    `absent_count` INTEGER NOT NULL DEFAULT 0,
    `course_id` INTEGER NOT NULL,
    `class_id` INTEGER NOT NULL,
    `classroom_id` INTEGER NOT NULL,
    `invigilator_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exam_exam_code_key`(`exam_code`),
    INDEX `exam_exam_date_idx`(`exam_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_student` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seat_number` VARCHAR(20) NULL,
    `score` DECIMAL(5, 2) NULL,
    `is_absent` BOOLEAN NOT NULL DEFAULT false,
    `admission_code` VARCHAR(50) NULL,
    `exam_id` INTEGER NOT NULL,
    `student_id` INTEGER NOT NULL,

    UNIQUE INDEX `exam_student_exam_id_student_id_key`(`exam_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `textbook` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isbn` VARCHAR(30) NOT NULL,
    `book_name` VARCHAR(150) NOT NULL,
    `author` VARCHAR(100) NULL,
    `publisher` VARCHAR(100) NULL,
    `price` DECIMAL(10, 2) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `textbook_isbn_key`(`isbn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `textbook_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester` VARCHAR(30) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `textbook_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `textbook_order_semester_textbook_id_course_id_key`(`semester`, `textbook_id`, `course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teaching_date` DATE NOT NULL,
    `teaching_content` TEXT NOT NULL,
    `attendance_note` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,
    `schedule_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('PRESENT', 'LATE', 'ABSENT', 'LEAVE') NOT NULL,
    `remark` VARCHAR(255) NULL,
    `teaching_log_id` INTEGER NOT NULL,
    `student_id` INTEGER NOT NULL,

    UNIQUE INDEX `attendance_record_teaching_log_id_student_id_key`(`teaching_log_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graduation_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `required_credits` DECIMAL(6, 1) NOT NULL,
    `earned_credits` DECIMAL(6, 1) NOT NULL,
    `failed_courses` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `audit_comment` VARCHAR(500) NULL,
    `audited_at` DATETIME(3) NULL,
    `student_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `graduation_audit_student_id_key`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `teacher_user_id_key` ON `teacher`(`user_id`);

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `teacher_office_id_fkey` FOREIGN KEY (`office_id`) REFERENCES `teaching_office`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `teacher_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class` ADD CONSTRAINT `student_class_major_id_fkey` FOREIGN KEY (`major_id`) REFERENCES `major`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `student_class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `course_office_id_fkey` FOREIGN KEY (`office_id`) REFERENCES `teaching_office`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_schedule` ADD CONSTRAINT `teaching_schedule_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_schedule` ADD CONSTRAINT `teaching_schedule_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_schedule` ADD CONSTRAINT `teaching_schedule_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `student_class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_schedule` ADD CONSTRAINT `teaching_schedule_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `classroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classroom_application` ADD CONSTRAINT `classroom_application_applicant_id_fkey` FOREIGN KEY (`applicant_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classroom_application` ADD CONSTRAINT `classroom_application_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `classroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_adjustment` ADD CONSTRAINT `course_adjustment_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `teaching_schedule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_adjustment` ADD CONSTRAINT `course_adjustment_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_adjustment` ADD CONSTRAINT `course_adjustment_new_classroom_id_fkey` FOREIGN KEY (`new_classroom_id`) REFERENCES `classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `student_class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `classroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_invigilator_id_fkey` FOREIGN KEY (`invigilator_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_student` ADD CONSTRAINT `exam_student_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_student` ADD CONSTRAINT `exam_student_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_textbook_id_fkey` FOREIGN KEY (`textbook_id`) REFERENCES `textbook`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_log` ADD CONSTRAINT `teaching_log_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `teaching_schedule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_log` ADD CONSTRAINT `teaching_log_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_record` ADD CONSTRAINT `attendance_record_teaching_log_id_fkey` FOREIGN KEY (`teaching_log_id`) REFERENCES `teaching_log`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_record` ADD CONSTRAINT `attendance_record_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graduation_audit` ADD CONSTRAINT `graduation_audit_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
