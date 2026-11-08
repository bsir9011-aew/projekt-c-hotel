-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PackageBillingType" AS ENUM ('ONCE', 'PER_NIGHT');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_per_night" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "amenities" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_modifier" DECIMAL(10,2) NOT NULL,
    "billing_type" "PackageBillingType" NOT NULL DEFAULT 'ONCE',
    "included_services" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_code" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "package_id" TEXT,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "nights_count" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "guest_first_name" TEXT NOT NULL,
    "guest_last_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "guest_phone" TEXT NOT NULL,
    "voucher_code" TEXT,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_number_key" ON "rooms"("room_number");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_room_id_check_in_check_out_idx" ON "bookings"("room_id", "check_in", "check_out");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Poniższe ograniczenia dodano ręcznie, ponieważ Prisma nie potrafi ich opisać w schemacie. (DamianTchorzewski_72206)

-- Data wyjazdu musi być późniejsza niż data przyjazdu. (DamianTchorzewski_72206)
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dates_check" CHECK ("check_out" > "check_in");

-- Rezerwacja musi obejmować co najmniej jednego gościa. (DamianTchorzewski_72206)
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guests_check" CHECK ("guests_count" > 0);

-- Rozszerzenie pozwala łączyć operator równości (kolumna tekstowa) z zakresem dat w jednym indeksie GiST. (DamianTchorzewski_72206)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Jeden pokój nie może mieć dwóch potwierdzonych rezerwacji o nakładających się terminach. (DamianTchorzewski_72206)
-- Zakres [) oznacza, że dzień wyjazdu jednego gościa może być dniem przyjazdu kolejnego. (DamianTchorzewski_72206)
-- Rezerwacje anulowane nie blokują terminu. Naruszenie tego ograniczenia serwis zamienia na odpowiedź 409. (DamianTchorzewski_72206)
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
    EXCLUDE USING gist ("room_id" WITH =, daterange("check_in", "check_out", '[)') WITH &&)
    WHERE ("status" = 'CONFIRMED');
