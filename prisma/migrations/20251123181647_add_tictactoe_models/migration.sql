/*
  Warnings:

  - You are about to drop the column `consecutive_wins` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `consecutive_wins`,
    DROP COLUMN `score`;

-- CreateTable
CREATE TABLE `tic_tac_toe_stats` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `current_win_streak` INTEGER NOT NULL DEFAULT 0,
    `total_wins` INTEGER NOT NULL DEFAULT 0,
    `total_losses` INTEGER NOT NULL DEFAULT 0,
    `total_draws` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tic_tac_toe_stats_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tic_tac_toe_games` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `result` ENUM('WIN', 'LOSS', 'DRAW') NOT NULL,
    `starting_side` ENUM('HUMAN', 'BOT') NOT NULL,
    `score_delta` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tic_tac_toe_moves` (
    `id` VARCHAR(191) NOT NULL,
    `game_id` VARCHAR(191) NOT NULL,
    `move_order` INTEGER NOT NULL,
    `player` ENUM('HUMAN', 'BOT') NOT NULL,
    `position` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tic_tac_toe_stats` ADD CONSTRAINT `tic_tac_toe_stats_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tic_tac_toe_games` ADD CONSTRAINT `tic_tac_toe_games_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tic_tac_toe_moves` ADD CONSTRAINT `tic_tac_toe_moves_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `tic_tac_toe_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
