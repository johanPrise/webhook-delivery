-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "responseBody" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryAttempt_eventId_attemptNumber_idx" ON "DeliveryAttempt"("eventId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
