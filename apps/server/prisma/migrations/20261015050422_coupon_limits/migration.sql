-- AlterTable
ALTER TABLE `coupons` ADD COLUMN `description` VARCHAR(255) NULL,
    ADD COLUMN `per_user_limit` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX `user_coupons_coupon_id_status_idx` ON `user_coupons`(`coupon_id`, `status`);
