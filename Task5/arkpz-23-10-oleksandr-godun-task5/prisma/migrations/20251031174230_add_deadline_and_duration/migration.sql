-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `deadline` DATETIME(3) NULL,
    ADD COLUMN `duration` INTEGER NULL,
    ADD COLUMN `start_time` DATETIME(3) NULL;
