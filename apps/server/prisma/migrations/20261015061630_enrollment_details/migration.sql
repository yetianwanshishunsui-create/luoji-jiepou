-- AlterTable
ALTER TABLE `enrollments` ADD COLUMN `cancel_reason` VARCHAR(255) NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `contact_phone_masked` VARCHAR(20) NOT NULL DEFAULT '';
