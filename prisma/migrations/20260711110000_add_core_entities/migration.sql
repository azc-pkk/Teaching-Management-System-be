-- AlterTable
ALTER TABLE `classroom` ADD COLUMN `area` DECIMAL(8, 2) NULL,
    MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `course` ADD COLUMN `department_id` INTEGER NULL,
    MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `sys_user` ADD COLUMN `student_id` INTEGER NULL,
    ADD COLUMN `teacher_id` INTEGER NULL,
    MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `department_id` INTEGER NULL,
    MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `parent_id` INTEGER NULL,
    `type` VARCHAR(30) NULL,
    `manager_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `department_code_key`(`code`),
    INDEX `department_parent_id_idx`(`parent_id`),
    INDEX `department_manager_id_idx`(`manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `major` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `department_id` INTEGER NOT NULL,
    `duration_years` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `major_code_key`(`code`),
    INDEX `major_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `grade` INTEGER NOT NULL,
    `major_id` INTEGER NOT NULL,
    `department_id` INTEGER NOT NULL,
    `counselor_id` INTEGER NULL,
    `student_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `class_group_major_id_idx`(`major_id`),
    INDEX `class_group_department_id_idx`(`department_id`),
    INDEX `class_group_counselor_id_idx`(`counselor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_no` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `class_group_id` INTEGER NOT NULL,
    `grade` INTEGER NOT NULL,
    `status` ENUM('ENROLLED', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN') NOT NULL DEFAULT 'ENROLLED',
    `phone` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `student_student_no_key`(`student_no`),
    INDEX `student_class_group_id_idx`(`class_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semester` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'PLANNED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `semester_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `class_group_id` INTEGER NOT NULL,
    `classroom_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `invigilator_id` INTEGER NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_semester_id_idx`(`semester_id`),
    INDEX `exam_course_id_idx`(`course_id`),
    INDEX `exam_class_group_id_idx`(`class_group_id`),
    INDEX `exam_classroom_id_idx`(`classroom_id`),
    INDEX `exam_invigilator_id_idx`(`invigilator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `textbook` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isbn` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `author` VARCHAR(100) NULL,
    `publisher` VARCHAR(150) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `textbook_isbn_key`(`isbn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `textbook_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `textbook_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `textbook_order_semester_id_idx`(`semester_id`),
    INDEX `textbook_order_course_id_idx`(`course_id`),
    INDEX `textbook_order_textbook_id_idx`(`textbook_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classroom_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicant_id` INTEGER NOT NULL,
    `classroom_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `classroom_request_applicant_id_idx`(`applicant_id`),
    INDEX `classroom_request_classroom_id_idx`(`classroom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_change` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `class_group_id` INTEGER NOT NULL,
    `hours` DECIMAL(5, 1) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `schedule_change_teacher_id_idx`(`teacher_id`),
    INDEX `schedule_change_course_id_idx`(`course_id`),
    INDEX `schedule_change_class_group_id_idx`(`class_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graduation_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `semester_id` INTEGER NOT NULL,
    `total_credits` DECIMAL(6, 1) NOT NULL,
    `has_failed_required_course` BOOLEAN NOT NULL DEFAULT false,
    `result` ENUM('PENDING', 'PASSED', 'FAILED', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(500) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `graduation_review_semester_id_idx`(`semester_id`),
    UNIQUE INDEX `graduation_review_student_id_semester_id_key`(`student_id`, `semester_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `class_group_id` INTEGER NOT NULL,
    `lesson_date` DATE NOT NULL,
    `content` TEXT NOT NULL,
    `attendance_summary` TEXT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teaching_log_teacher_id_idx`(`teacher_id`),
    INDEX `teaching_log_course_id_idx`(`course_id`),
    INDEX `teaching_log_class_group_id_idx`(`class_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `business_type` VARCHAR(50) NOT NULL,
    `business_id` INTEGER NOT NULL,
    `operator_id` INTEGER NOT NULL,
    `action` ENUM('SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'CANCEL') NOT NULL,
    `comment` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `approval_record_business_type_business_id_idx`(`business_type`, `business_id`),
    INDEX `approval_record_operator_id_idx`(`operator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `target_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `operation_log_user_id_idx`(`user_id`),
    INDEX `operation_log_module_target_id_idx`(`module`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `course_department_id_idx` ON `course`(`department_id`);

-- CreateIndex
CREATE UNIQUE INDEX `sys_user_teacher_id_key` ON `sys_user`(`teacher_id`);

-- CreateIndex
CREATE UNIQUE INDEX `sys_user_student_id_key` ON `sys_user`(`student_id`);

-- CreateIndex
CREATE INDEX `teacher_department_id_idx` ON `teacher`(`department_id`);

-- AddForeignKey
ALTER TABLE `sys_user` ADD CONSTRAINT `sys_user_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user` ADD CONSTRAINT `sys_user_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department` ADD CONSTRAINT `department_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department` ADD CONSTRAINT `department_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `major` ADD CONSTRAINT `major_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_major_id_fkey` FOREIGN KEY (`major_id`) REFERENCES `major`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_counselor_id_fkey` FOREIGN KEY (`counselor_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `teacher_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_class_group_id_fkey` FOREIGN KEY (`class_group_id`) REFERENCES `class_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `course_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_class_group_id_fkey` FOREIGN KEY (`class_group_id`) REFERENCES `class_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `classroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_invigilator_id_fkey` FOREIGN KEY (`invigilator_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `textbook_order` ADD CONSTRAINT `textbook_order_textbook_id_fkey` FOREIGN KEY (`textbook_id`) REFERENCES `textbook`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classroom_request` ADD CONSTRAINT `classroom_request_applicant_id_fkey` FOREIGN KEY (`applicant_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classroom_request` ADD CONSTRAINT `classroom_request_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `classroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_change` ADD CONSTRAINT `schedule_change_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_change` ADD CONSTRAINT `schedule_change_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_change` ADD CONSTRAINT `schedule_change_class_group_id_fkey` FOREIGN KEY (`class_group_id`) REFERENCES `class_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graduation_review` ADD CONSTRAINT `graduation_review_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graduation_review` ADD CONSTRAINT `graduation_review_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_log` ADD CONSTRAINT `teaching_log_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_log` ADD CONSTRAINT `teaching_log_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_log` ADD CONSTRAINT `teaching_log_class_group_id_fkey` FOREIGN KEY (`class_group_id`) REFERENCES `class_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_record` ADD CONSTRAINT `approval_record_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_log` ADD CONSTRAINT `operation_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `course` RENAME INDEX `course_leader_teacher_id_fkey` TO `course_leader_teacher_id_idx`;
