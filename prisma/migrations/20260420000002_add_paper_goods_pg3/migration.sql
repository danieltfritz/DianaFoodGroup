-- PG3: Menu paper item assignments

CREATE TABLE [dbo].[MenuPaperItem] (
    [id]          INT           NOT NULL,
    [schoolId]    INT           NULL,
    [menuId]      INT           NOT NULL,
    [week]        INT           NOT NULL,
    [dayId]       INT           NOT NULL,
    [mealId]      INT           NOT NULL,
    [ageGroupId]  INT           NOT NULL,
    [paperId]     INT           NOT NULL,
    [paperSizeId] INT           NULL,
    [paperQty]    INT           NOT NULL CONSTRAINT [MenuPaperItem_paperQty_df] DEFAULT 0,
    [isAlways]    BIT           NOT NULL CONSTRAINT [MenuPaperItem_isAlways_df] DEFAULT 0,
    CONSTRAINT [MenuPaperItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [MenuPaperItem_menuId_week_dayId_idx]
    ON [dbo].[MenuPaperItem] ([menuId], [week], [dayId]);

ALTER TABLE [dbo].[MenuPaperItem]
    ADD CONSTRAINT [MenuPaperItem_menuId_fkey]
    FOREIGN KEY ([menuId]) REFERENCES [dbo].[Menu] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[MenuPaperItem]
    ADD CONSTRAINT [MenuPaperItem_paperId_fkey]
    FOREIGN KEY ([paperId]) REFERENCES [dbo].[PaperItem] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[MenuPaperItem]
    ADD CONSTRAINT [MenuPaperItem_paperSizeId_fkey]
    FOREIGN KEY ([paperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
