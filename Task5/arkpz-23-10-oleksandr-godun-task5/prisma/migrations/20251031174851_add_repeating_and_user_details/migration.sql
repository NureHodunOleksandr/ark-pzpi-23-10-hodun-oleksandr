-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `is_repeating` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `birth_date` DATETIME(3) NULL,
    ADD COLUMN `last_name` VARCHAR(191) NULL;
