-- PG5: Paper production runs and per-school amounts

CREATE TABLE [dbo].[PaperProductionRun] (
    [id]           INT IDENTITY(1,1) NOT NULL,
    [startDate]    DATE          NOT NULL,
    [endDate]      DATE          NOT NULL,
    [createdAt]    DATETIME2     NOT NULL CONSTRAINT [PaperProductionRun_createdAt_df] DEFAULT GETDATE(),
    [paperGroupId] INT           NULL,
    [notes]        NVARCHAR(500) NULL,
    CONSTRAINT [PaperProductionRun_pkey] PRIMARY KEY CLUSTERED ([id])
);

ALTER TABLE [dbo].[PaperProductionRun]
    ADD CONSTRAINT [PaperProductionRun_paperGroupId_fkey]
    FOREIGN KEY ([paperGroupId]) REFERENCES [dbo].[PaperGroup] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE [dbo].[PaperRunSchoolAmount] (
    [id]          INT IDENTITY(1,1) NOT NULL,
    [runId]       INT NOT NULL,
    [schoolId]    INT NOT NULL,
    [paperId]     INT NOT NULL,
    [paperSizeId] INT NULL,
    [totalQty]    INT NOT NULL,
    CONSTRAINT [PaperRunSchoolAmount_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [PaperRunSchoolAmount_runId_schoolId_idx]
    ON [dbo].[PaperRunSchoolAmount] ([runId], [schoolId]);

ALTER TABLE [dbo].[PaperRunSchoolAmount]
    ADD CONSTRAINT [PaperRunSchoolAmount_runId_fkey]
    FOREIGN KEY ([runId]) REFERENCES [dbo].[PaperProductionRun] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperRunSchoolAmount]
    ADD CONSTRAINT [PaperRunSchoolAmount_schoolId_fkey]
    FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperRunSchoolAmount]
    ADD CONSTRAINT [PaperRunSchoolAmount_paperId_fkey]
    FOREIGN KEY ([paperId]) REFERENCES [dbo].[PaperItem] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaperRunSchoolAmount]
    ADD CONSTRAINT [PaperRunSchoolAmount_paperSizeId_fkey]
    FOREIGN KEY ([paperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
