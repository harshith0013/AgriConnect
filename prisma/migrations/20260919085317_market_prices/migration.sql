-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketPriceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "category" TEXT,
    "minPrice" REAL,
    "maxPrice" REAL,
    "modalPrice" REAL,
    "unit" TEXT NOT NULL,
    "grade" TEXT,
    "priceDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "dataStatus" TEXT NOT NULL DEFAULT 'SAMPLE',
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketPriceRecord_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Market_state_district_idx" ON "Market"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "Market_name_state_district_key" ON "Market"("name", "state", "district");

-- CreateIndex
CREATE INDEX "MarketPriceRecord_cropName_priceDate_idx" ON "MarketPriceRecord"("cropName", "priceDate");

-- CreateIndex
CREATE INDEX "MarketPriceRecord_marketId_priceDate_idx" ON "MarketPriceRecord"("marketId", "priceDate");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPriceRecord_marketId_cropName_priceDate_source_key" ON "MarketPriceRecord"("marketId", "cropName", "priceDate", "source");
