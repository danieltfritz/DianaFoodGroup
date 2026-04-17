BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'staff',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[AgeGroup] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [startAge] INT NOT NULL,
    [endAge] INT NOT NULL,
    CONSTRAINT [AgeGroup_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Meal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [Meal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Route] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [driver] VARCHAR(50),
    CONSTRAINT [Route_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[County] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [County_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MenuType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [MenuType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FoodType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [FoodType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[School] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [address] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [state] VARCHAR(20),
    [postalCode] VARCHAR(20),
    [contactName] VARCHAR(100),
    [phone] VARCHAR(30),
    [email] VARCHAR(100),
    [fax] VARCHAR(30),
    [routeId] INT,
    [countyId] INT,
    [deliveryMon] BIT NOT NULL CONSTRAINT [School_deliveryMon_df] DEFAULT 0,
    [deliveryTue] BIT NOT NULL CONSTRAINT [School_deliveryTue_df] DEFAULT 0,
    [deliveryWed] BIT NOT NULL CONSTRAINT [School_deliveryWed_df] DEFAULT 0,
    [deliveryThu] BIT NOT NULL CONSTRAINT [School_deliveryThu_df] DEFAULT 0,
    [deliveryFri] BIT NOT NULL CONSTRAINT [School_deliveryFri_df] DEFAULT 0,
    [deliverySat] BIT NOT NULL CONSTRAINT [School_deliverySat_df] DEFAULT 0,
    [deliverySun] BIT NOT NULL CONSTRAINT [School_deliverySun_df] DEFAULT 0,
    [notes] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [School_active_df] DEFAULT 1,
    CONSTRAINT [School_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Container] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [isVariable] BIT NOT NULL CONSTRAINT [Container_isVariable_df] DEFAULT 0,
    [allowPartial] BIT NOT NULL CONSTRAINT [Container_allowPartial_df] DEFAULT 0,
    [menuTypeId] INT,
    [units] VARCHAR(50),
    CONSTRAINT [Container_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContainerSize] (
    [id] INT NOT NULL IDENTITY(1,1),
    [containerId] INT NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [abbreviation] VARCHAR(50) NOT NULL,
    [size] DECIMAL(10,4) NOT NULL,
    CONSTRAINT [ContainerSize_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FoodItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [tempType] VARCHAR(10) NOT NULL,
    [foodTypeId] INT,
    [isMilk] BIT NOT NULL CONSTRAINT [FoodItem_isMilk_df] DEFAULT 0,
    [hasLabel] BIT NOT NULL CONSTRAINT [FoodItem_hasLabel_df] DEFAULT 1,
    [showOnReport] BIT NOT NULL CONSTRAINT [FoodItem_showOnReport_df] DEFAULT 1,
    [menuTypeId] INT,
    [defaultContainerId] INT,
    [containerThreshold] DECIMAL(10,4),
    [pkSize] INT,
    [pkUnit] VARCHAR(50),
    CONSTRAINT [FoodItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServingSize] (
    [id] INT NOT NULL IDENTITY(1,1),
    [mealId] INT NOT NULL,
    [foodItemId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [servingSize] DECIMAL(10,4) NOT NULL,
    CONSTRAINT [ServingSize_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ServingSize_mealId_foodItemId_ageGroupId_key] UNIQUE NONCLUSTERED ([mealId],[foodItemId],[ageGroupId])
);

-- CreateTable
CREATE TABLE [dbo].[Menu] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [cycleWeeks] INT NOT NULL,
    [effectiveDate] DATE NOT NULL,
    [isBoxMenu] BIT NOT NULL CONSTRAINT [Menu_isBoxMenu_df] DEFAULT 0,
    [delaySnack] BIT NOT NULL CONSTRAINT [Menu_delaySnack_df] DEFAULT 0,
    [menuTypeId] INT,
    CONSTRAINT [Menu_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MenuItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [menuId] INT NOT NULL,
    [foodItemId] INT NOT NULL,
    [mealId] INT NOT NULL,
    [week] INT NOT NULL,
    [dayId] INT NOT NULL,
    CONSTRAINT [MenuItem_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MenuItem_menuId_foodItemId_mealId_week_dayId_key] UNIQUE NONCLUSTERED ([menuId],[foodItemId],[mealId],[week],[dayId])
);

-- CreateTable
CREATE TABLE [dbo].[SchoolMenu] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolId] INT NOT NULL,
    [menuId] INT NOT NULL,
    [startDate] DATE NOT NULL,
    [endDate] DATE,
    CONSTRAINT [SchoolMenu_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SchoolClosing] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolId] INT NOT NULL,
    [startDate] DATE NOT NULL,
    [endDate] DATE NOT NULL,
    CONSTRAINT [SchoolClosing_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[KidCount] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolId] INT NOT NULL,
    [schoolMenuId] INT NOT NULL,
    [date] DATE NOT NULL,
    [mealId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [count] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [KidCount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [KidCount_schoolId_date_mealId_ageGroupId_key] UNIQUE NONCLUSTERED ([schoolId],[date],[mealId],[ageGroupId])
);

-- CreateTable
CREATE TABLE [dbo].[BillingGroup] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    CONSTRAINT [BillingGroup_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BillingSchoolGroup] (
    [id] INT NOT NULL IDENTITY(1,1),
    [billingGroupId] INT NOT NULL,
    [schoolId] INT NOT NULL,
    CONSTRAINT [BillingSchoolGroup_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BillingSchoolGroup_billingGroupId_schoolId_key] UNIQUE NONCLUSTERED ([billingGroupId],[schoolId])
);

-- CreateTable
CREATE TABLE [dbo].[MealPrice] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolMenuId] INT NOT NULL,
    [schoolId] INT NOT NULL,
    [mealId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    CONSTRAINT [MealPrice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MealPrice_schoolMenuId_schoolId_mealId_ageGroupId_key] UNIQUE NONCLUSTERED ([schoolMenuId],[schoolId],[mealId],[ageGroupId])
);

-- CreateTable
CREATE TABLE [dbo].[QbMealCode] (
    [id] INT NOT NULL IDENTITY(1,1),
    [transactionType] VARCHAR(50) NOT NULL,
    [qbCode] VARCHAR(50) NOT NULL,
    [order] INT NOT NULL,
    [mealId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [description] VARCHAR(100) NOT NULL,
    CONSTRAINT [QbMealCode_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BillingRun] (
    [id] INT NOT NULL IDENTITY(1,1),
    [deliveryDate] DATE NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BillingRun_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BillingRun_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BillingRunDetail] (
    [id] INT NOT NULL IDENTITY(1,1),
    [billingRunId] INT NOT NULL,
    [schoolId] INT NOT NULL,
    [mealId] INT NOT NULL,
    [ageGroupId] INT NOT NULL,
    [isBox] BIT NOT NULL CONSTRAINT [BillingRunDetail_isBox_df] DEFAULT 0,
    [kidCount] INT NOT NULL,
    [priceUsed] DECIMAL(10,2) NOT NULL,
    CONSTRAINT [BillingRunDetail_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MilkOverride] (
    [id] INT NOT NULL IDENTITY(1,1),
    [schoolMenuId] INT NOT NULL,
    [foodItemId] INT NOT NULL,
    [milkFoodItemId] INT NOT NULL,
    [containerSizeId] INT NOT NULL,
    [containerCount] INT NOT NULL,
    CONSTRAINT [MilkOverride_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [KidCount_date_idx] ON [dbo].[KidCount]([date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [KidCount_schoolId_date_idx] ON [dbo].[KidCount]([schoolId], [date]);

-- AddForeignKey
ALTER TABLE [dbo].[School] ADD CONSTRAINT [School_routeId_fkey] FOREIGN KEY ([routeId]) REFERENCES [dbo].[Route]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[School] ADD CONSTRAINT [School_countyId_fkey] FOREIGN KEY ([countyId]) REFERENCES [dbo].[County]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ContainerSize] ADD CONSTRAINT [ContainerSize_containerId_fkey] FOREIGN KEY ([containerId]) REFERENCES [dbo].[Container]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FoodItem] ADD CONSTRAINT [FoodItem_defaultContainerId_fkey] FOREIGN KEY ([defaultContainerId]) REFERENCES [dbo].[Container]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServingSize] ADD CONSTRAINT [ServingSize_mealId_fkey] FOREIGN KEY ([mealId]) REFERENCES [dbo].[Meal]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServingSize] ADD CONSTRAINT [ServingSize_foodItemId_fkey] FOREIGN KEY ([foodItemId]) REFERENCES [dbo].[FoodItem]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServingSize] ADD CONSTRAINT [ServingSize_ageGroupId_fkey] FOREIGN KEY ([ageGroupId]) REFERENCES [dbo].[AgeGroup]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MenuItem] ADD CONSTRAINT [MenuItem_menuId_fkey] FOREIGN KEY ([menuId]) REFERENCES [dbo].[Menu]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MenuItem] ADD CONSTRAINT [MenuItem_foodItemId_fkey] FOREIGN KEY ([foodItemId]) REFERENCES [dbo].[FoodItem]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MenuItem] ADD CONSTRAINT [MenuItem_mealId_fkey] FOREIGN KEY ([mealId]) REFERENCES [dbo].[Meal]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SchoolMenu] ADD CONSTRAINT [SchoolMenu_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SchoolMenu] ADD CONSTRAINT [SchoolMenu_menuId_fkey] FOREIGN KEY ([menuId]) REFERENCES [dbo].[Menu]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SchoolClosing] ADD CONSTRAINT [SchoolClosing_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[KidCount] ADD CONSTRAINT [KidCount_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[KidCount] ADD CONSTRAINT [KidCount_schoolMenuId_fkey] FOREIGN KEY ([schoolMenuId]) REFERENCES [dbo].[SchoolMenu]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[KidCount] ADD CONSTRAINT [KidCount_mealId_fkey] FOREIGN KEY ([mealId]) REFERENCES [dbo].[Meal]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[KidCount] ADD CONSTRAINT [KidCount_ageGroupId_fkey] FOREIGN KEY ([ageGroupId]) REFERENCES [dbo].[AgeGroup]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BillingSchoolGroup] ADD CONSTRAINT [BillingSchoolGroup_billingGroupId_fkey] FOREIGN KEY ([billingGroupId]) REFERENCES [dbo].[BillingGroup]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BillingSchoolGroup] ADD CONSTRAINT [BillingSchoolGroup_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MealPrice] ADD CONSTRAINT [MealPrice_schoolMenuId_fkey] FOREIGN KEY ([schoolMenuId]) REFERENCES [dbo].[SchoolMenu]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MealPrice] ADD CONSTRAINT [MealPrice_schoolId_fkey] FOREIGN KEY ([schoolId]) REFERENCES [dbo].[School]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MealPrice] ADD CONSTRAINT [MealPrice_mealId_fkey] FOREIGN KEY ([mealId]) REFERENCES [dbo].[Meal]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MealPrice] ADD CONSTRAINT [MealPrice_ageGroupId_fkey] FOREIGN KEY ([ageGroupId]) REFERENCES [dbo].[AgeGroup]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BillingRunDetail] ADD CONSTRAINT [BillingRunDetail_billingRunId_fkey] FOREIGN KEY ([billingRunId]) REFERENCES [dbo].[BillingRun]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MilkOverride] ADD CONSTRAINT [MilkOverride_schoolMenuId_fkey] FOREIGN KEY ([schoolMenuId]) REFERENCES [dbo].[SchoolMenu]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MilkOverride] ADD CONSTRAINT [MilkOverride_foodItemId_fkey] FOREIGN KEY ([foodItemId]) REFERENCES [dbo].[FoodItem]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
