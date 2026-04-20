CREATE TABLE [dbo].[PaperItem] (
    [id]     INT           NOT NULL,
    [name]   NVARCHAR(100) NOT NULL,
    [active] BIT           NOT NULL CONSTRAINT [PaperItem_active_df] DEFAULT 1,
    CONSTRAINT [PaperItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[PaperSize] (
    [id]      INT           NOT NULL,
    [paperId] INT           NOT NULL,
    [name]    NVARCHAR(50)  NULL,
    CONSTRAINT [PaperSize_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaperSize_paperId_fkey] FOREIGN KEY ([paperId]) REFERENCES [dbo].[PaperItem] ([id])
);

CREATE TABLE [dbo].[PaperContainer] (
    [id]            INT           NOT NULL,
    [paperId]       INT           NOT NULL,
    [paperSizeId]   INT           NOT NULL,
    [containerName] NVARCHAR(50)  NOT NULL,
    [containerSize] INT           NOT NULL,
    CONSTRAINT [PaperContainer_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaperContainer_paperId_fkey]     FOREIGN KEY ([paperId])     REFERENCES [dbo].[PaperItem] ([id]),
    CONSTRAINT [PaperContainer_paperSizeId_fkey] FOREIGN KEY ([paperSizeId]) REFERENCES [dbo].[PaperSize] ([id])
);
