BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[MilkType] (
    [id] INT NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [labelColor] VARCHAR(50) NOT NULL,
    CONSTRAINT [MilkType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MilkCount] (
    [id] INT NOT NULL IDENTITY(1,1),
    [kidCountId] INT NOT NULL,
    [milkTypeId] INT NOT NULL,
    [count] INT NOT NULL CONSTRAINT [MilkCount_count_df] DEFAULT 0,
    CONSTRAINT [MilkCount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MilkCount_kidCountId_milkTypeId_key] UNIQUE NONCLUSTERED ([kidCountId],[milkTypeId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MilkCount_kidCountId_idx] ON [dbo].[MilkCount]([kidCountId]);

-- AddForeignKey
ALTER TABLE [dbo].[MilkCount] ADD CONSTRAINT [MilkCount_kidCountId_fkey] FOREIGN KEY ([kidCountId]) REFERENCES [dbo].[KidCount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MilkCount] ADD CONSTRAINT [MilkCount_milkTypeId_fkey] FOREIGN KEY ([milkTypeId]) REFERENCES [dbo].[MilkType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
