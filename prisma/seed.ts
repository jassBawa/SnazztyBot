import { prisma } from "../src/services/db/client";

async function main() {
  const tokenPairs = [
    {
      baseToken: 'SOL',
      baseMint: 'So11111111111111111111111111111111111111112',
      baseTokenDecimals: 9, // SOL has 9 decimals
      targetToken: 'IMG',
      targetMint: 'H3grgvuWs6aa5ANDYQ1Cwh2U9WfpFb9GWVUqZTWr3teq',
      targetTokenDecimals: 9, // IMG token decimals (adjust as needed)
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
        baseTokenDecimals: pair.baseTokenDecimals,
        targetMint: pair.targetMint,
        targetTokenDecimals: pair.targetTokenDecimals,
        active: true,
      },
      create: {
        baseToken: pair.baseToken,
        baseMint: pair.baseMint,
        baseTokenDecimals: pair.baseTokenDecimals,
        targetToken: pair.targetToken,
        targetMint: pair.targetMint,
        targetTokenDecimals: pair.targetTokenDecimals,
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
