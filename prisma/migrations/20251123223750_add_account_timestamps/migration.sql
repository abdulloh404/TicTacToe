/*
  Warnings:

  - A unique constraint covering the columns `[user_id,provider]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `accounts_user_id_provider_key` ON `accounts`(`user_id`, `provider`);
