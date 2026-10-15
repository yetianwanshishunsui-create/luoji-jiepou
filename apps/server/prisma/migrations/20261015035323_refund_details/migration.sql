-- AlterTable
ALTER TABLE `orders` ADD COLUMN `refunded_cent` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `refunds` ADD COLUMN `fail_reason` VARCHAR(255) NULL,
    ADD COLUMN `revoke_entitlement` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `wx_refund_id` VARCHAR(64) NULL;

-- CreateIndex
CREATE INDEX `refunds_status_created_at_idx` ON `refunds`(`status`, `created_at`);

-- RenameIndex
ALTER TABLE `refunds` RENAME INDEX `refunds_order_id_fkey` TO `refunds_order_id_idx`;
