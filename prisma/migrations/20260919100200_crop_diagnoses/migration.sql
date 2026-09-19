-- CreateTable
CREATE TABLE "CropDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "imageSize" INTEGER NOT NULL,
    "prediction" TEXT,
    "confidence" REAL,
    "resultStatus" TEXT NOT NULL DEFAULT 'PROCESSING',
    "guidanceKey" TEXT,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CropDiagnosis_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CropDiagnosis_farmerId_createdAt_idx" ON "CropDiagnosis"("farmerId", "createdAt");

-- CreateIndex
CREATE INDEX "CropDiagnosis_resultStatus_idx" ON "CropDiagnosis"("resultStatus");
