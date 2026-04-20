-- PG4: Food paper assignments and per-school override rules

CREATE TABLE [dbo].[FoodPaperItem] (
    [id]          INT NOT NULL,
    [schoolId]    INT NULL,
    [foodId]      INT NOT NULL,
    [mealId]      INT NOT NULL,
    [ageGroupId]  INT NOT NULL,
    [paperId]     INT NOT NULL,
    [paperSizeId] INT NULL,
    [isAlways]    BIT NOT NULL CONSTRAINT [FoodPaperItem_isAlways_df] DEFAULT 0,
    CONSTRAINT [FoodPaperItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [FoodPaperItem_foodId_mealId_ageGroupId_idx]
    ON [dbo].[FoodPaperItem] ([foodId], [mealId], [ageGroupId]);

ALTER TABLE [dbo].[FoodPaperItem]
    ADD CONSTRAINT [FoodPaperItem_paperId_fkey]
    FOREIGN KEY ([paperId]) REFERENCES [dbo].[PaperItem] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[FoodPaperItem]
    ADD CONSTRAINT [FoodPaperItem_paperSizeId_fkey]
    FOREIGN KEY ([paperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE [dbo].[PaperOverride] (
    [id]            INT NOT NULL,
    [schoolId]      INT NOT NULL,
    [mealId]        INT NOT NULL,
    [ageGroupId]    INT NOT NULL,
    [paperId]       INT NOT NULL,
    [paperSizeId]   INT NULL,
    [orPaperId]     INT NULL,
    [orPaperSizeId] INT NULL,
    CONSTRAINT [PaperOverride_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [PaperOverride_schoolId_mealId_ageGroupId_idx]
    ON [dbo].[PaperOverride] ([schoolId], [mealId], [ageGroupId]);

ALTER TABLE [dbo].[PaperOverride]
    ADD CONSTRAINT [PaperOverride_schoolId_fkey]
    FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperOverride]
    ADD CONSTRAINT [PaperOverride_paperId_fkey]
    FOREIGN KEY ([paperId]) REFERENCES [dbo].[PaperItem] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperOverride]
    ADD CONSTRAINT [PaperOverride_orPaperId_fkey]
    FOREIGN KEY ([orPaperId]) REFERENCES [dbo].[PaperItem] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperOverride]
    ADD CONSTRAINT [PaperOverride_paperSizeId_fkey]
    FOREIGN KEY ([paperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperOverride]
    ADD CONSTRAINT [PaperOverride_orPaperSizeId_fkey]
    FOREIGN KEY ([orPaperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
