BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[KidCountAudit] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolId] INT NOT NULL,
    [date] DATE NOT NULL,
    [mealId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [oldCount] INT NOT NULL,
    [newCount] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [KidCountAudit_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [KidCountAudit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [KidCountAudit_date_idx] ON [dbo].[KidCountAudit]([date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [KidCountAudit_schoolId_date_idx] ON [dbo].[KidCountAudit]([schoolId], [date]);

-- AddForeignKey
ALTER TABLE [dbo].[KidCountAudit] ADD CONSTRAINT [KidCountAudit_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
