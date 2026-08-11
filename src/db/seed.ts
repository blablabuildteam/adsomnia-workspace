import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcryptjs";
import { users } from "./schema";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql);

  const defaultPassword =
    process.env.SEED_USER_PASSWORD ?? "Adsomnia2026!";

  const teamMembers = [
    {
      name: "Sietse",
      email: process.env.LOGIN_SIETSE_EMAIL ?? "sietse@adsomnia.com",
      password: process.env.LOGIN_SIETSE_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Oleg",
      email: process.env.LOGIN_OLEG_EMAIL ?? "oleg@adsomnia.com",
      password: process.env.LOGIN_OLEG_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Jasper",
      email: process.env.LOGIN_JASPER_EMAIL ?? "jasper@adsomnia.com",
      password: process.env.LOGIN_JASPER_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Coen",
      email: process.env.LOGIN_COEN_EMAIL ?? "coen@adsomnia.com",
      password: process.env.LOGIN_COEN_PASSWORD ?? defaultPassword,
      role: "production" as const,
    },
  ];

  console.log("Seeding users...");

  for (const member of teamMembers) {
    const passwordHash = hashSync(member.password, 10);

    await db
      .insert(users)
      .values({
        name: member.name,
        email: member.email,
        passwordHash,
        role: member.role,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: member.name,
          passwordHash,
          role: member.role,
        },
      });

    console.log(`  ✓ ${member.name} (${member.email})`);
  }

  console.log("\nDone! All users seeded.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
