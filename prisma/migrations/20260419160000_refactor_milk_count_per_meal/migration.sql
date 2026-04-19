BEGIN TRY

BEGIN TRAN;

-- Drop old MilkCount table (was keyed by kidCountId)
DROP TABLE IF EXISTS [dbo].[MilkCount];

-- CreateTable: MilkCount keyed by school/date/meal/milkType
CREATE TABLE [dbo].[MilkCount] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolId] INT NOT NULL,
    [date] DATE NOT NULL,
    [mealId] INT NOT NULL,
    [milkTypeId] INT NOT NULL,
    [count] INT NOT NULL CONSTRAINT [MilkCount_count_df] DEFAULT 0,
    CONSTRAINT [MilkCount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MilkCount_schoolId_date_mealId_milkTypeId_key] UNIQUE NONCLUSTERED ([schoolId],[date],[mealId],[milkTypeId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MilkCount_schoolId_date_idx] ON [dbo].[MilkCount]([schoolId],[date]);

-- AddForeignKey
ALTER TABLE [dbo].[MilkCount] ADD CONSTRAINT [MilkCount_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MilkCount] ADD CONSTRAINT [MilkCount_milkTypeId_fkey] FOREIGN KEY ([milkTypeId]) REFERENCES [dbo].[MilkType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
