-- CreateTable
CREATE TABLE "ColdStorageFacility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "supportedCrops" TEXT NOT NULL,
    "capacity" REAL,
    "capacityUnit" TEXT,
    "availabilityStatus" TEXT,
    "rentalCharge" REAL,
    "rentalUnit" TEXT,
    "contact" TEXT,
    "source" TEXT NOT NULL,
    "dataStatus" TEXT NOT NULL DEFAULT 'SAMPLE',
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StorageRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "listingId" TEXT,
    "orderId" TEXT,
    "cropName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StorageRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StorageRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ColdStorageFacility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StorageRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ProduceListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StorageRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "vehicleType" TEXT NOT NULL,
    "capacity" REAL,
    "capacityUnit" TEXT,
    "serviceAreas" TEXT NOT NULL,
    "estimatedCharge" REAL,
    "availabilityStatus" TEXT,
    "source" TEXT NOT NULL,
    "dataStatus" TEXT NOT NULL DEFAULT 'SAMPLE',
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransportRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerId" TEXT NOT NULL,
    "providerId" TEXT,
    "listingId" TEXT,
    "orderId" TEXT,
    "cropName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "pickupDate" DATETIME NOT NULL,
    "vehicleRequirements" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ProduceListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ColdStorageFacility_state_district_idx" ON "ColdStorageFacility"("state", "district");

-- CreateIndex
CREATE INDEX "ColdStorageFacility_name_idx" ON "ColdStorageFacility"("name");

-- CreateIndex
CREATE INDEX "StorageRequest_farmerId_status_idx" ON "StorageRequest"("farmerId", "status");

-- CreateIndex
CREATE INDEX "StorageRequest_facilityId_status_idx" ON "StorageRequest"("facilityId", "status");

-- CreateIndex
CREATE INDEX "TransportProvider_vehicleType_idx" ON "TransportProvider"("vehicleType");

-- CreateIndex
CREATE INDEX "TransportRequest_farmerId_status_idx" ON "TransportRequest"("farmerId", "status");

-- CreateIndex
CREATE INDEX "TransportRequest_providerId_status_idx" ON "TransportRequest"("providerId", "status");
