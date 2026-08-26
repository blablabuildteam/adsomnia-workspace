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

  const now = new Date();

  /** All seeded accounts are leadership admins (same capabilities as Sietse). */
  const teamMembers = [
    {
      name: "Sietse",
      firstName: "Sietse",
      lastName: "",
      email: process.env.LOGIN_SIETSE_EMAIL ?? "sietse@adsomnia.com",
      password: process.env.LOGIN_SIETSE_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Oleg",
      firstName: "Oleg",
      lastName: "",
      email: process.env.LOGIN_OLEG_EMAIL ?? "oleg@adsomnia.com",
      password: process.env.LOGIN_OLEG_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Jasper",
      firstName: "Jasper",
      lastName: "",
      email: process.env.LOGIN_JASPER_EMAIL ?? "jasper@adsomnia.com",
      password: process.env.LOGIN_JASPER_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Coen",
      firstName: "Coen",
      lastName: "",
      email: process.env.LOGIN_COEN_EMAIL ?? "coen@adsomnia.com",
      password: process.env.LOGIN_COEN_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Xennith",
      firstName: "Xennith",
      lastName: "",
      email: process.env.LOGIN_XENNITH_EMAIL ?? "xennith@blablabuild.com",
      password: process.env.LOGIN_XENNITH_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
    {
      name: "Kevin",
      firstName: "Kevin",
      lastName: "",
      email: process.env.LOGIN_KEVIN_EMAIL ?? "kevin@blablabuild.com",
      password: process.env.LOGIN_KEVIN_PASSWORD ?? defaultPassword,
      role: "leadership" as const,
    },
  ];

  console.log("Seeding users...");

  for (const member of teamMembers) {
    const passwordHash = hashSync(member.password, 10);
    const email = member.email.toLowerCase().trim();

    await db
      .insert(users)
      .values({
        name: member.name,
        firstName: member.firstName || null,
        lastName: member.lastName || null,
        email,
        passwordHash,
        role: member.role,
        profileCompletedAt: now,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: member.name,
          firstName: member.firstName || null,
          lastName: member.lastName || null,
          passwordHash,
          role: member.role,
          profileCompletedAt: now,
        },
      });

    console.log(`  ✓ ${member.name} (${member.email}) [${member.role}]`);
  }

  console.log("\nDone! All users seeded.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
