import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Decimal } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Asset Data...\n');

  const employees = await prisma.employee.findMany({ take: 100 });

  if (employees.length === 0) {
    console.log('❌ No employees found. Run seed:mega first.');
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. ASSETS (Tài sản: laptop, điện thoại, máy bàn, nội thất, xe)
  // ─────────────────────────────────────────────────────────────────
  console.log('🖥️  Creating Assets...');
  let assetCount = 0;

  const laptopBrands = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS'];
  const laptopModels = [
    'MacBook Pro 14"',
    'MacBook Air 13"',
    'Dell XPS 13',
    'ThinkPad X1 Carbon',
    'HP Elite Dragonfly',
  ];
  const phoneBrands = ['iPhone', 'Samsung', 'Oppo', 'Xiaomi'];
  const phoneModels = ['15 Pro Max', 'Galaxy S24', 'Reno 10', 'Xiaomi 14'];
  const furnitureItems = ['Bàn làm việc', 'Ghế văn phòng', 'Tủ lưu trữ', 'Kệ sách'];
  const vehicleModels = ['Toyota Vios', 'Hyundai i10', 'Honda City', 'Kia Picanto'];

  const assetTemplates = [
    // Laptops - 50
    ...Array.from({ length: 50 }, (_, i) => ({
      code: `LP-${String(i + 1).padStart(4, '0')}`,
      name: `Laptop ${laptopBrands[i % laptopBrands.length]} ${laptopModels[i % laptopModels.length]}`,
      category: 'LAPTOP' as const,
      brand: laptopBrands[i % laptopBrands.length],
      model: laptopModels[i % laptopModels.length],
      purchasePrice: new Decimal(Math.floor(Math.random() * 40000000) + 20000000), // 20-60M
      depreciationYears: 4,
    })),
    // Phones - 40
    ...Array.from({ length: 40 }, (_, i) => ({
      code: `PH-${String(i + 1).padStart(4, '0')}`,
      name: `Điện thoại ${phoneBrands[i % phoneBrands.length]} ${phoneModels[i % phoneModels.length]}`,
      category: 'PHONE' as const,
      brand: phoneBrands[i % phoneBrands.length],
      model: phoneModels[i % phoneModels.length],
      purchasePrice: new Decimal(Math.floor(Math.random() * 15000000) + 5000000), // 5-20M
      depreciationYears: 3,
    })),
    // Furniture - 30
    ...Array.from({ length: 30 }, (_, i) => ({
      code: `FR-${String(i + 1).padStart(4, '0')}`,
      name: furnitureItems[i % furnitureItems.length],
      category: 'FURNITURE' as const,
      brand: undefined,
      model: undefined,
      purchasePrice: new Decimal(Math.floor(Math.random() * 5000000) + 1000000), // 1-6M
      depreciationYears: 5,
    })),
    // Vehicles - 10
    ...Array.from({ length: 10 }, (_, i) => ({
      code: `VH-${String(i + 1).padStart(4, '0')}`,
      name: vehicleModels[i % vehicleModels.length],
      category: 'VEHICLE' as const,
      brand: vehicleModels[i % vehicleModels.length].split(' ')[0],
      model: vehicleModels[i % vehicleModels.length],
      purchasePrice: new Decimal(Math.floor(Math.random() * 500000000) + 300000000), // 300M-800M
      depreciationYears: 8,
    })),
    // Peripherals - 15
    ...Array.from({ length: 15 }, (_, i) => ({
      code: `PE-${String(i + 1).padStart(4, '0')}`,
      name: ['Monitor 27"', 'Keyboard', 'Mouse', 'Webcam', 'Headset'][i % 5],
      category: 'PERIPHERAL' as const,
      brand: ['Dell', 'Logitech', 'Razer', 'Sony', 'Sennheiser'][i % 5],
      model: ['U2723DE', 'MX Master 3S', 'DeathAdder V3', 'WH-1000XM5', 'Premium'][i % 5],
      purchasePrice: new Decimal(Math.floor(Math.random() * 5000000) + 1000000), // 1-6M
      depreciationYears: 3,
    })),
  ];

  for (const template of assetTemplates) {
    try {
      await prisma.asset.create({
        data: {
          code: template.code,
          name: template.name,
          category: template.category,
          brand: template.brand,
          model: template.model,
          serialNumber: `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          status: Math.random() > 0.3 ? 'ASSIGNED' : 'AVAILABLE',
          purchaseDate: dayjs().subtract(Math.random() * 1000, 'days').toDate(),
          purchasePrice: template.purchasePrice,
          depreciationYears: template.depreciationYears,
          notes: `Asset code: ${template.code}`,
        },
      });
      assetCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${assetCount} assets created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. ASSET ASSIGNMENTS (Gán tài sản cho nhân viên)
  // ─────────────────────────────────────────────────────────────────
  console.log('👤 Creating Asset Assignments...');
  let assignmentCount = 0;

  const assets = await prisma.asset.findMany();

  // Gán ~70% assets cho employees (mỗi employee nhận 0-3 assets)
  for (let i = 0; i < Math.floor(assets.length * 0.7); i++) {
    const asset = assets[i];
    const emp = employees[i % employees.length];
    const assignedDate = dayjs().subtract(Math.random() * 500, 'days').toDate();

    try {
      const hasReturned = Math.random() > 0.7;
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: emp.id,
          assignedAt: assignedDate,
          returnedAt: hasReturned ? dayjs(assignedDate).add(Math.random() * 300, 'days').toDate() : null,
          notes: `Assigned to ${emp.fullName}`,
        },
      });
      assignmentCount++;
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`   ✓ ${assignmentCount} asset assignments created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 3. MAINTENANCE LOGS (Lịch sử bảo trì)
  // ─────────────────────────────────────────────────────────────────
  console.log('🔧 Creating Asset Maintenance Logs...');
  let maintenanceCount = 0;

  const maintenanceTypes = ['CLEANING', 'REPAIR', 'SOFTWARE_UPDATE', 'UPGRADE', 'INSPECTION'];
  const maintenanceReasons = [
    'Vệ sinh định kỳ',
    'Thay pin',
    'Cập nhật phần mềm',
    'Sửa chữa hư hỏng',
    'Kiểm tra định kỳ',
    'Thay ổ cứng',
    'Nâng cấp RAM',
  ];

  for (let i = 0; i < 100; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];

    try {
      await prisma.assetMaintenance.create({
        data: {
          assetId: asset.id,
          type: maintenanceType,
          performedAt: dayjs()
            .subtract(Math.random() * 300, 'days')
            .toDate(),
          cost:
            maintenanceType === 'UPGRADE'
              ? new Decimal(Math.floor(Math.random() * 5000000) + 1000000)
              : maintenanceType === 'REPAIR'
                ? new Decimal(Math.floor(Math.random() * 2000000) + 500000)
                : new Decimal(0),
          performedBy: ['Kỹ thuật viên IT', 'Nhân viên IT', 'Công ty bảo trì', 'Nhân viên HR'][
            Math.floor(Math.random() * 4)
          ],
          notes: maintenanceReasons[Math.floor(Math.random() * maintenanceReasons.length)],
        },
      });
      maintenanceCount++;
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`   ✓ ${maintenanceCount} maintenance logs created\n`);

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ ASSET SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
🖥️  Assets:                ${assetCount}
👤 Asset Assignments:     ${assignmentCount}
🔧 Maintenance Logs:      ${maintenanceCount}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
