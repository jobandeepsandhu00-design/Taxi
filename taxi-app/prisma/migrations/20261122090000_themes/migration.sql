-- AlterTable
ALTER TABLE "User" ADD COLUMN     "theme" VARCHAR(16) NOT NULL DEFAULT 'weiss',
ADD COLUMN     "themeMode" VARCHAR(8) NOT NULL DEFAULT 'light';

