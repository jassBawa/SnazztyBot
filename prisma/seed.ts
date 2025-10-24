import { prisma } from "../src/services/db";

async function main() {
  const tokenPairs = [
    {
      baseToken: 'SOL',
      baseMint: 'So11111111111111111111111111111111111111112',
      targetToken: 'IMG',
      targetMint: 'EdibWH8u5rmCGmbU1jBBEJtnk3Qo7JdU71FAzkWu2dhH',
    },
    {
      baseToken: 'SOL',
      baseMint: 'So11111111111111111111111111111111111111112',
      targetToken: 'BAS',
      targetMint: '74Nh1p1JD2hsq3Kn55NMH8bvazFDkpgZoeWPYUWcianF',
    },
  ];

  for (const pair of tokenPairs) {
    await prisma.tokenPair.upsert({
      where: {
        baseToken_targetToken: {
          baseToken: pair.baseToken,
          targetToken: pair.targetToken,
        },
      },
      update: {
        baseMint: pair.baseMint,
        targetMint: pair.targetMint,
        active: true,
      },
      create: {
        baseToken: pair.baseToken,
        baseMint: pair.baseMint,
        targetToken: pair.targetToken,
        targetMint: pair.targetMint,
      },
    });
  }

  console.log('✅ Token pairs seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
