-- CreateTable
CREATE TABLE `sys_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `real_name` VARCHAR(50) NOT NULL,
    `role` ENUM('ADMIN', 'ACADEMIC', 'TEACHER', 'STUDENT') NOT NULL,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_no` VARCHAR(30) NOT NULL,
    `teacher_name` VARCHAR(50) NOT NULL,
    `teacher_type` VARCHAR(30) NULL,
    `title` VARCHAR(50) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teacher_teacher_no_key`(`teacher_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_code` VARCHAR(30) NOT NULL,
    `course_name` VARCHAR(100) NOT NULL,
    `credit` DECIMAL(4, 1) NOT NULL,
    `course_type` VARCHAR(30) NULL,
    `leader_teacher_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `course_course_code_key`(`course_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classroom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_code` VARCHAR(30) NOT NULL,
    `room_name` VARCHAR(100) NOT NULL,
    `campus` VARCHAR(100) NULL,
    `building` VARCHAR(100) NULL,
    `room_type` VARCHAR(30) NULL,
    `capacity` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `classroom_room_code_key`(`room_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `course_leader_teacher_id_fkey` FOREIGN KEY (`leader_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
