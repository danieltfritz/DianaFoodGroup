/*
  Warnings:

  - You are about to alter the column `priceUsed` on the `BillingRunDetail` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.
  - You are about to alter the column `price` on the `MealPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[BillingRunDetail] ALTER COLUMN [priceUsed] DECIMAL(10,4) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[MealPrice] ALTER COLUMN [price] DECIMAL(10,4) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
