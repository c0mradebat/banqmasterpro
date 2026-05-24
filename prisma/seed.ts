import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Role, RoomType, RoomStatus, VendorKind } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLE_DEFAULTS } from "../src/lib/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding…");

  // System roles — created with `upsert` so existing custom permissions aren't overwritten.
  const roleByKey: Record<string, { id: string }> = {};
  for (const [key, def] of Object.entries(SYSTEM_ROLE_DEFAULTS)) {
    const r = await db.roleDef.upsert({
      where: { key },
      update: {}, // never stomp on admin-edited permissions during reseed
      create: {
        key,
        name: def.name,
        description: def.description,
        level: def.level,
        isSystem: true,
        permissions: def.permissions,
      },
      select: { id: true, key: true },
    });
    roleByKey[r.key] = { id: r.id };
  }

  // Settings
  await db.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      venueName: "Silver Star Banquets",
      venueAddress: "Main Road, Patna, Bihar",
      venuePhone: "+91-9876543210",
      venueEmail: "info@silverstar.example",
      gstNumber: "10ABCDE1234F1Z5",
    },
  });

  // Users — also backfill roleId for any users created before the dynamic-roles refactor.
  const passwordHash = await bcrypt.hash("admin123", 10);
  const owner = await db.user.upsert({
    where: { username: "owner" },
    update: { roleId: roleByKey.OWNER.id },
    create: {
      username: "owner",
      email: "owner@silverstar.example",
      name: "Hall Owner",
      passwordHash,
      role: Role.OWNER,
      roleId: roleByKey.OWNER.id,
      pin: "1234",
    },
  });
  await db.user.upsert({
    where: { username: "admin" },
    update: { roleId: roleByKey.ADMIN.id },
    create: {
      username: "admin",
      email: "admin@silverstar.example",
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN,
      roleId: roleByKey.ADMIN.id,
      pin: "1111",
    },
  });
  await db.user.upsert({
    where: { username: "manager" },
    update: { roleId: roleByKey.MANAGER.id },
    create: {
      username: "manager",
      email: "manager@silverstar.example",
      name: "Hall Manager",
      passwordHash,
      role: Role.MANAGER,
      roleId: roleByKey.MANAGER.id,
      pin: "2222",
    },
  });
  await db.user.upsert({
    where: { username: "reception" },
    update: { roleId: roleByKey.RECEPTIONIST.id },
    create: {
      username: "reception",
      email: "reception@silverstar.example",
      name: "Front Desk",
      passwordHash,
      role: Role.RECEPTIONIST,
      roleId: roleByKey.RECEPTIONIST.id,
      pin: "3333",
    },
  });
  await db.user.upsert({
    where: { username: "accountant" },
    update: { roleId: roleByKey.ACCOUNTANT.id },
    create: {
      username: "accountant",
      email: "accountant@silverstar.example",
      name: "Accountant",
      passwordHash,
      role: Role.ACCOUNTANT,
      roleId: roleByKey.ACCOUNTANT.id,
      pin: "4444",
    },
  });

  // Backfill: any user without a roleId gets the system role matching their legacy enum role.
  const orphans = await db.user.findMany({ where: { roleId: null }, select: { id: true, role: true } });
  for (const u of orphans) {
    const target = roleByKey[u.role];
    if (target) {
      await db.user.update({ where: { id: u.id }, data: { roleId: target.id } });
    }
  }

  // Rooms — typical banquet hall mix
  const types: { count: number; type: RoomType; floor: number }[] = [
    { count: 8, type: "NON_BALCONY", floor: 1 },
    { count: 6, type: "BALCONY", floor: 1 },
    { count: 4, type: "BALCONY", floor: 2 },
    { count: 2, type: "SUITE", floor: 2 },
    { count: 2, type: "DORMITORY", floor: 0 },
  ];
  let roomNo = 101;
  for (const t of types) {
    for (let i = 0; i < t.count; i++) {
      await db.room.upsert({
        where: { number: String(roomNo) },
        update: {},
        create: {
          number: String(roomNo),
          type: t.type,
          floor: t.floor,
          capacity: t.type === "DORMITORY" ? 8 : t.type === "SUITE" ? 4 : 2,
          status: RoomStatus.AVAILABLE,
        },
      });
      roomNo++;
    }
  }

  // Vendors
  const vendors = [
    { name: "Royal Caterers", kind: VendorKind.CATERER, phone: "+91-9000000001" },
    { name: "Spice Route Catering", kind: VendorKind.CATERER, phone: "+91-9000000002" },
    { name: "Floral Magic Decor", kind: VendorKind.DECORATOR, phone: "+91-9000000003" },
    { name: "Glow Decorators", kind: VendorKind.DECORATOR, phone: "+91-9000000004" },
    { name: "Prime Events", kind: VendorKind.EVENT_MANAGER, phone: "+91-9000000005" },
    { name: "DJ BlackBeat", kind: VendorKind.DJ, phone: "+91-9000000006" },
  ];
  for (const v of vendors) {
    const exists = await db.vendor.findFirst({ where: { name: v.name } });
    if (!exists) await db.vendor.create({ data: v });
  }

  // Inventory
  const inv = [
    { name: "Extra Mattress", category: "bedding", unitCost: 300, currentStock: 50, minStock: 10 },
    { name: "Bath Towel", category: "linen", unitCost: 200, currentStock: 200, minStock: 50 },
    { name: "Hand Towel", category: "linen", unitCost: 80, currentStock: 200, minStock: 50 },
    { name: "Banquet Chair", category: "furniture", unitCost: 500, currentStock: 400, minStock: 100 },
    { name: "Dining Table", category: "furniture", unitCost: 4000, currentStock: 60, minStock: 10 },
  ];
  for (const i of inv) {
    const exists = await db.inventoryItem.findFirst({ where: { name: i.name } });
    if (!exists) await db.inventoryItem.create({ data: i });
  }

  // Sample customer + booking
  const cust = await db.customer.upsert({
    where: { phone: "+91-9999900001" },
    update: {},
    create: {
      firstName: "Rahul",
      lastName: "Verma",
      phone: "+91-9999900001",
      city: "Patna",
      state: "Bihar",
    },
  });

  const existing = await db.booking.findFirst({ where: { code: "BM-DEMO-0001" } });
  if (!existing) {
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(2, 0, 0, 0);

    await db.booking.create({
      data: {
        code: "BM-DEMO-0001",
        status: "CONFIRMED",
        eventType: "MARRIAGE",
        eventStart: start,
        eventEnd: end,
        guestCount: 400,
        customerId: cust.id,
        createdById: owner.id,
        hasMarriageHall: true,
        hasDiningHall: true,
        hasLawn: true,
        subtotal: 250000,
        securityDeposit: 70000,
        totalAmount: 250000,
        paidAmount: 100000,
        balanceDue: 220000, // total + deposit - paid = 250 + 70 - 100
        electricityRate: 12,
        generatorRate: 800,
        serviceItems: {
          create: [
            { kind: "MARRIAGE_HALL", startsAt: start, endsAt: end, unitPrice: 100000, total: 100000 },
            { kind: "DINING_HALL", startsAt: start, endsAt: end, unitPrice: 80000, total: 80000 },
            { kind: "LAWN", startsAt: start, endsAt: end, unitPrice: 70000, total: 70000 },
          ],
        },
        payments: {
          create: [
            { amount: 70000, kind: "SECURITY_DEPOSIT", method: "BANK_TRANSFER", recordedById: owner.id },
            { amount: 30000, kind: "ADVANCE", method: "UPI", recordedById: owner.id },
          ],
        },
      },
    });
  }

  console.log("✅ Seed complete");
  console.log("   Login: owner / admin / manager / reception / accountant");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
