-- Room alerts can be sent on WhatsApp
ALTER TABLE "RoomAlert" ADD COLUMN "whatsapp" BOOLEAN NOT NULL DEFAULT false;
