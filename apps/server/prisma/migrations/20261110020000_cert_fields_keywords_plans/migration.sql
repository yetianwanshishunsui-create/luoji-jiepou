-- AlterTable
ALTER TABLE `certifications` ADD COLUMN `city` VARCHAR(32) NULL,
    ADD COLUMN `department` VARCHAR(64) NULL,
    ADD COLUMN `phone_enc` VARCHAR(255) NULL,
    ADD COLUMN `phone_masked` VARCHAR(20) NULL,
    ADD COLUMN `position` VARCHAR(64) NULL,
    ADD COLUMN `province` VARCHAR(16) NULL,
    MODIFY `real_name_enc` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `body_parts` JSON NULL,
    ADD COLUMN `keywords` JSON NULL;

-- CreateTable
CREATE TABLE `offline_plans` (
    `user_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `offline_plans_session_id_idx`(`session_id`),
    PRIMARY KEY (`user_id`, `session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offline_plans` ADD CONSTRAINT `offline_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offline_plans` ADD CONSTRAINT `offline_plans_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `offline_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

