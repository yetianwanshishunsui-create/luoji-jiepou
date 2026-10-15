-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(64) NOT NULL,
    `unionid` VARCHAR(64) NULL,
    `phone_enc` VARCHAR(255) NULL,
    `phone_hash` VARCHAR(64) NULL,
    `phone_masked` VARCHAR(20) NULL,
    `nickname` VARCHAR(64) NULL,
    `avatar` VARCHAR(512) NULL,
    `identity_type` ENUM('DOCTOR', 'PRACTITIONER') NULL,
    `cert_status` ENUM('UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'UNSUBMITTED',
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_openid_key`(`openid`),
    UNIQUE INDEX `users_unionid_key`(`unionid`),
    UNIQUE INDEX `users_phone_hash_key`(`phone_hash`),
    INDEX `users_cert_status_idx`(`cert_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `identity_type` ENUM('DOCTOR', 'PRACTITIONER') NOT NULL,
    `real_name_enc` VARCHAR(255) NOT NULL,
    `license_no_enc` VARCHAR(255) NULL,
    `license_no_hash` VARCHAR(64) NULL,
    `organization` VARCHAR(128) NULL,
    `files` JSON NOT NULL,
    `status` ENUM('UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `reject_reason` VARCHAR(255) NULL,
    `reviewer_id` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `ocr_result` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `certifications_user_id_idx`(`user_id`),
    INDEX `certifications_status_created_at_idx`(`status`, `created_at`),
    INDEX `certifications_license_no_hash_idx`(`license_no_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `name` VARCHAR(64) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `visible_to` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    INDEX `categories_parent_id_sort_idx`(`parent_id`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('COURSE', 'COLUMN', 'SERIES', 'OFFLINE') NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `subtitle` VARCHAR(255) NULL,
    `cover` VARCHAR(512) NULL,
    `detail_html` MEDIUMTEXT NULL,
    `pricing_mode` ENUM('FREE', 'PAID') NOT NULL DEFAULT 'PAID',
    `price_cent` INTEGER NOT NULL DEFAULT 0,
    `origin_cent` INTEGER NULL,
    `visible_to` JSON NOT NULL,
    `status` ENUM('DRAFT', 'ONLINE', 'OFFLINE') NOT NULL DEFAULT 'DRAFT',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `category_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_status_type_sort_idx`(`status`, `type`, `sort`),
    INDEX `products_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_items` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `child_product_id` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `product_items_product_id_child_product_id_key`(`product_id`, `child_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapters` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `chapters_product_id_sort_idx`(`product_id`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` VARCHAR(191) NOT NULL,
    `chapter_id` VARCHAR(191) NOT NULL,
    `type` ENUM('VIDEO', 'AUDIO', 'ARTICLE') NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `vod_file_id` VARCHAR(64) NULL,
    `audio_key` VARCHAR(512) NULL,
    `content_html` MEDIUMTEXT NULL,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `is_trial` BOOLEAN NOT NULL DEFAULT false,
    `trial_seconds` INTEGER NOT NULL DEFAULT 0,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `lessons_chapter_id_sort_idx`(`chapter_id`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_audios` (
    `id` VARCHAR(191) NOT NULL,
    `publish_date` DATE NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `audio_key` VARCHAR(512) NOT NULL,
    `duration` INTEGER NOT NULL DEFAULT 60,
    `visible_to` JSON NOT NULL,
    `status` ENUM('DRAFT', 'ONLINE', 'OFFLINE') NOT NULL DEFAULT 'DRAFT',

    UNIQUE INDEX `daily_audios_publish_date_key`(`publish_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_rules` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `type` ENUM('EARLY_BIRD', 'LIMITED_TIME') NOT NULL,
    `price_cent` INTEGER NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    INDEX `price_rules_product_id_start_at_end_at_idx`(`product_id`, `start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `type` ENUM('FULL_REDUCTION', 'DIRECT') NOT NULL,
    `threshold_cent` INTEGER NOT NULL DEFAULT 0,
    `discount_cent` INTEGER NOT NULL,
    `scope` ENUM('ALL', 'CATEGORY', 'PRODUCT') NOT NULL DEFAULT 'ALL',
    `scope_ids` JSON NULL,
    `total_count` INTEGER NOT NULL DEFAULT 0,
    `issued_count` INTEGER NOT NULL DEFAULT 0,
    `claimable` BOOLEAN NOT NULL DEFAULT false,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_to` DATETIME(3) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_coupons` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `coupon_id` VARCHAR(191) NOT NULL,
    `status` ENUM('UNUSED', 'LOCKED', 'USED', 'EXPIRED') NOT NULL DEFAULT 'UNUSED',
    `used_order_id` VARCHAR(191) NULL,
    `claimed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `used_at` DATETIME(3) NULL,

    INDEX `user_coupons_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `order_no` VARCHAR(32) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `purpose` ENUM('PRODUCT', 'OFFLINE_DEPOSIT', 'OFFLINE_BALANCE') NOT NULL DEFAULT 'PRODUCT',
    `status` ENUM('CREATED', 'PAID', 'CLOSED', 'CANCELLED', 'REFUNDING', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    `total_cent` INTEGER NOT NULL,
    `discount_cent` INTEGER NOT NULL DEFAULT 0,
    `pay_cent` INTEGER NOT NULL,
    `user_coupon_id` VARCHAR(191) NULL,
    `wx_transaction_id` VARCHAR(64) NULL,
    `paid_at` DATETIME(3) NULL,
    `expire_at` DATETIME(3) NOT NULL,
    `closed_at` DATETIME(3) NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_no_key`(`order_no`),
    UNIQUE INDEX `orders_wx_transaction_id_key`(`wx_transaction_id`),
    INDEX `orders_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `orders_status_expire_at_idx`(`status`, `expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `price_cent` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `order_items_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `refund_no` VARCHAR(32) NOT NULL,
    `amount_cent` INTEGER NOT NULL,
    `status` ENUM('PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    `reason` VARCHAR(255) NULL,
    `operator_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `refunds_refund_no_key`(`refund_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offline_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `quota` INTEGER NOT NULL,
    `deposit_cent` INTEGER NOT NULL,
    `balance_cent` INTEGER NOT NULL,
    `balance_due_at` DATETIME(3) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    INDEX `offline_sessions_product_id_start_at_idx`(`product_id`, `start_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(64) NOT NULL,
    `contact_phone_enc` VARCHAR(255) NOT NULL,
    `deposit_order_id` VARCHAR(191) NULL,
    `balance_order_id` VARCHAR(191) NULL,
    `status` ENUM('DEPOSIT_PENDING', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DEPOSIT_PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `enrollments_deposit_order_id_key`(`deposit_order_id`),
    UNIQUE INDEX `enrollments_balance_order_id_key`(`balance_order_id`),
    INDEX `enrollments_user_id_idx`(`user_id`),
    INDEX `enrollments_session_id_status_idx`(`session_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entitlements` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `source` ENUM('ORDER', 'FREE', 'GIFT') NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `expire_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `entitlements_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_progress` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `lesson_id` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `learning_progress_user_id_updated_at_idx`(`user_id`, `updated_at`),
    UNIQUE INDEX `learning_progress_user_id_lesson_id_key`(`user_id`, `lesson_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(64) NULL,
    `name` VARCHAR(64) NOT NULL,
    `phone_enc` VARCHAR(255) NOT NULL,
    `phone_hash` VARCHAR(64) NOT NULL,
    `phone_masked` VARCHAR(20) NOT NULL,
    `city` VARCHAR(64) NULL,
    `organization` VARCHAR(128) NULL,
    `intention` VARCHAR(255) NULL,
    `extra` JSON NULL,
    `status` ENUM('NEW', 'CONTACTED', 'CONVERTED', 'INVALID') NOT NULL DEFAULT 'NEW',
    `remark` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leads_status_created_at_idx`(`status`, `created_at`),
    INDEX `leads_phone_hash_idx`(`phone_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banners` (
    `id` VARCHAR(191) NOT NULL,
    `identity_type` ENUM('DOCTOR', 'PRACTITIONER') NULL,
    `position` VARCHAR(32) NOT NULL,
    `image` VARCHAR(512) NOT NULL,
    `link` VARCHAR(512) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `online_at` DATETIME(3) NULL,
    `offline_at` DATETIME(3) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    INDEX `banners_position_identity_type_sort_idx`(`position`, `identity_type`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_configs` (
    `key` VARCHAR(64) NOT NULL,
    `value` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(32) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'OPERATOR', 'REVIEWER', 'FINANCE') NOT NULL DEFAULT 'OPERATOR',
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NULL,
    `action` VARCHAR(64) NOT NULL,
    `target` VARCHAR(128) NULL,
    `detail` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_admin_id_created_at_idx`(`admin_id`, `created_at`),
    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `certifications` ADD CONSTRAINT `certifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certifications` ADD CONSTRAINT `certifications_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_items` ADD CONSTRAINT `product_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_items` ADD CONSTRAINT `product_items_child_product_id_fkey` FOREIGN KEY (`child_product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_rules` ADD CONSTRAINT `price_rules_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offline_sessions` ADD CONSTRAINT `offline_sessions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `offline_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_deposit_order_id_fkey` FOREIGN KEY (`deposit_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_balance_order_id_fkey` FOREIGN KEY (`balance_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_progress` ADD CONSTRAINT `learning_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_progress` ADD CONSTRAINT `learning_progress_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
