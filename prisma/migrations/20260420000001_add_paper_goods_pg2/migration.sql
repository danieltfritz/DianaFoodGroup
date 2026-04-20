-- PG2: Paper delivery groups + school assignments + per-school comments

CREATE TABLE [dbo].[PaperGroup] (
    [id]   INT           NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PaperGroup_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[SchoolPaperGroup] (
    [id]           INT IDENTITY(1,1) NOT NULL,
    [schoolId]     INT NOT NULL,
    [paperGroupId] INT NOT NULL,
    CONSTRAINT [SchoolPaperGroup_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE UNIQUE INDEX [SchoolPaperGroup_schoolId_paperGroupId_key]
    ON [dbo].[SchoolPaperGroup] ([schoolId], [paperGroupId]);

ALTER TABLE [dbo].[SchoolPaperGroup]
    ADD CONSTRAINT [SchoolPaperGroup_schoolId_fkey]
    FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[SchoolPaperGroup]
    ADD CONSTRAINT [SchoolPaperGroup_paperGroupId_fkey]
    FOREIGN KEY ([paperGroupId]) REFERENCES [dbo].[PaperGroup] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE [dbo].[SchoolPaperComment] (
    [id]       INT IDENTITY(1,1) NOT NULL,
    [schoolId] INT          NOT NULL,
    [comment]  NVARCHAR(1000) NOT NULL,
    CONSTRAINT [SchoolPaperComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE UNIQUE INDEX [SchoolPaperComment_schoolId_key]
    ON [dbo].[SchoolPaperComment] ([schoolId]);

ALTER TABLE [dbo].[SchoolPaperComment]
    ADD CONSTRAINT [SchoolPaperComment_schoolId_fkey]
    FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School] ([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
