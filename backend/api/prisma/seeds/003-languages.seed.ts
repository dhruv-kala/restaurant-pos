import { SeedContext } from './seed-context';

export async function seedLanguages({ prisma }: SeedContext): Promise<void> {
  const languages = [
    ['en', 'English'],
    ['en-IN', 'English (India)'],
    ['hi', 'Hindi'],
    ['gu', 'Gujarati'],
    ['mr', 'Marathi'],
    ['ta', 'Tamil'],
    ['te', 'Telugu'],
    ['ar', 'Arabic'],
  ] as const;
  for (const [code, name] of languages) {
    await prisma.language.upsert({
      where: { code },
      update: { name, isActive: true },
      create: { code, name },
    });
  }
  console.log(`003: seeded ${languages.length} languages.`);
}
