import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default cosmetics
  const cosmetics = [
    // Skis
    { key: 'ski_classic', name: 'Classic Skis', type: 'ski', rarity: 'common', unlockedByDefault: true },
    { key: 'ski_racing', name: 'Racing Skis', type: 'ski', rarity: 'rare', unlockedByDefault: false },
    { key: 'ski_gold', name: 'Golden Skis', type: 'ski', rarity: 'epic', unlockedByDefault: false },

    // Suits
    { key: 'suit_blue', name: 'Blue Suit', type: 'suit', rarity: 'common', unlockedByDefault: true },
    { key: 'suit_red', name: 'Red Suit', type: 'suit', rarity: 'common', unlockedByDefault: false },
    { key: 'suit_rainbow', name: 'Rainbow Suit', type: 'suit', rarity: 'epic', unlockedByDefault: false },

    // Hats
    { key: 'hat_beanie', name: 'Beanie', type: 'hat', rarity: 'common', unlockedByDefault: true },
    { key: 'hat_helmet', name: 'Racing Helmet', type: 'hat', rarity: 'rare', unlockedByDefault: false },
    { key: 'hat_crown', name: 'Crown', type: 'hat', rarity: 'epic', unlockedByDefault: false },
  ];

  for (const cosmetic of cosmetics) {
    await prisma.cosmetic.upsert({
      where: { key: cosmetic.key },
      update: {},
      create: cosmetic,
    });
  }

  console.log(`Created ${cosmetics.length} cosmetics`);

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@skipay.app' },
    update: {},
    create: {
      email: 'demo@skipay.app',
      displayName: 'Demo Player',
    },
  });

  // Give demo user default cosmetics
  const defaultCosmetics = await prisma.cosmetic.findMany({
    where: { unlockedByDefault: true },
  });

  for (const cosmetic of defaultCosmetics) {
    await prisma.userCosmetic.upsert({
      where: {
        userId_cosmeticId: {
          userId: demoUser.id,
          cosmeticId: cosmetic.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        cosmeticId: cosmetic.id,
        equipped: cosmetic.type === 'ski', // Equip skis by default
      },
    });
  }

  console.log('Demo user created with default cosmetics');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
