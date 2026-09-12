import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@dealbridge.dev" },
    update: {},
    create: {
      email: "admin@dealbridge.dev",
      name: "Ada Admin",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const customers = await Promise.all(
    [
      { email: "customer1@dealbridge.dev", name: "Cara Customer" },
      { email: "customer2@dealbridge.dev", name: "Charlie Customer" },
    ].map((c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: { ...c, passwordHash: password, role: "CUSTOMER" },
      })
    )
  );

  // Two of these are "claimed" (have a logged-in owner account) to exercise
  // the full business-dashboard flow. The rest are admin-added, unclaimed
  // directory listings — the normal way a business ends up on the platform.
  const businessSeeds = [
    {
      email: "brightpaint@dealbridge.dev",
      name: "Priya Owner",
      companyName: "BrightPaint Co.",
      category: "Home Services",
      description: "Residential and commercial painting with a 2-year workmanship guarantee.",
      phone: "(415) 555-0134",
      website: "brightpaintco.example",
      addressLine: "482 Folsom St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
      claimed: true,
    },
    {
      email: "pixelforge@dealbridge.dev",
      name: "Devon Owner",
      companyName: "PixelForge Studio",
      category: "Web & Software",
      description: "Custom web apps and websites built with modern frameworks, launched fast.",
      phone: "(415) 555-0188",
      website: "pixelforgestudio.example",
      addressLine: "901 Market St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
      claimed: true,
    },
    {
      email: null,
      companyName: "Handy Heroes",
      category: "Home Services",
      description: "Fast, affordable home repairs and painting crews available same-week.",
      phone: "(415) 555-0122",
      website: null,
      addressLine: null,
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
      claimed: false,
    },
    {
      email: null,
      companyName: "WebWrights",
      category: "Web & Software",
      description: "Budget-friendly websites for small businesses, delivered in days.",
      phone: "(415) 555-0177",
      website: null,
      addressLine: null,
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
      claimed: false,
    },
    {
      email: null,
      companyName: "GrowthLane Marketing",
      category: "Marketing",
      description: "Full-funnel digital marketing for local and e-commerce businesses.",
      phone: "(415) 555-0199",
      website: null,
      addressLine: null,
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
      claimed: false,
    },
    {
      email: null,
      companyName: "Golden Gate Electric",
      category: "Home Services",
      description: "Licensed electricians for panel upgrades, rewiring, and EV charger installs.",
      phone: "(415) 555-0143",
      website: null,
      addressLine: null,
      city: "San Francisco",
      state: "CA",
      zipCode: "94107",
      claimed: false,
    },
  ] as const;

  const businesses = await Promise.all(
    businessSeeds.map(async (b) => {
      const user = b.email
        ? await prisma.user.upsert({
            where: { email: b.email },
            update: {},
            create: {
              email: b.email,
              name: b.name!,
              passwordHash: password,
              role: "BUSINESS",
            },
          })
        : null;

      if (user) {
        return prisma.businessProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            companyName: b.companyName,
            category: b.category,
            description: b.description,
            phone: b.phone ?? undefined,
            website: b.website ?? undefined,
            addressLine: b.addressLine ?? undefined,
            city: b.city,
            state: b.state,
            zipCode: b.zipCode,
            claimed: b.claimed,
            source: "SELF_CLAIMED",
          },
        });
      }

      const existing = await prisma.businessProfile.findFirst({
        where: { companyName: b.companyName, zipCode: b.zipCode },
      });
      if (existing) return existing;

      return prisma.businessProfile.create({
        data: {
          companyName: b.companyName,
          category: b.category,
          description: b.description,
          phone: b.phone ?? undefined,
          website: b.website ?? undefined,
          addressLine: b.addressLine ?? undefined,
          city: b.city,
          state: b.state,
          zipCode: b.zipCode,
          claimed: false,
          source: "ADMIN_ADDED",
        },
      });
    })
  );

  const byCompany = (name: string) => businesses.find((b) => b.companyName === name)!;

  const existingRequests = await prisma.request.count();
  if (existingRequests === 0) {
    const req1 = await prisma.request.create({
      data: {
        customerId: customers[0].id,
        title: "Repaint 3-bedroom house exterior",
        description:
          "Looking for a crew to repaint the exterior of a 3-bedroom single-story house. Need pressure washing, prep, and two coats of quality exterior paint. Flexible on start date within the next 3 weeks.",
        category: "Home Services",
        zipCode: "94103",
        budgetMin: 1500,
        budgetMax: 3000,
        status: "OPEN",
      },
    });

    for (const [biz, price, days, desc] of [
      [byCompany("BrightPaint Co."), 2400, 5, "Includes pressure wash, premium Sherwin-Williams paint, 2-year warranty, and a 5-person crew."],
      [byCompany("Handy Heroes"), 1800, 8, "Budget-friendly option with standard paint, same great prep work, slightly longer timeline."],
    ] as const) {
      await prisma.offer.create({
        data: {
          requestId: req1.id,
          businessId: biz.id,
          price: price as number,
          deliveryDays: days as number,
          description: desc as string,
        },
      });
    }

    const req2 = await prisma.request.create({
      data: {
        customerId: customers[1].id,
        title: "Build a booking website for a yoga studio",
        description:
          "Need a clean, modern website with online class booking, payments, and a mobile-friendly schedule page. Prefer something we can update ourselves afterward.",
        category: "Web & Software",
        zipCode: "94103",
        budgetMin: 2000,
        budgetMax: 5000,
        status: "OPEN",
      },
    });

    for (const [biz, price, days, desc] of [
      [byCompany("PixelForge Studio"), 4200, 14, "Custom Next.js site with Stripe-powered booking, admin dashboard, and 3 months of free support."],
      [byCompany("WebWrights"), 2200, 21, "Template-based site with booking plugin, lower cost but longer delivery and limited customization."],
    ] as const) {
      await prisma.offer.create({
        data: {
          requestId: req2.id,
          businessId: biz.id,
          price: price as number,
          deliveryDays: days as number,
          description: desc as string,
        },
      });
    }

    await prisma.request.create({
      data: {
        customerId: customers[0].id,
        title: "Run a local Instagram ads campaign",
        description:
          "We're a new coffee shop and want to run a 1-month Instagram ads campaign to drive foot traffic in a 5-mile radius.",
        category: "Marketing",
        zipCode: "94103",
        budgetMin: 500,
        budgetMax: 1500,
        status: "OPEN",
      },
    });
  }

  // A handful of reviews so the two claimed businesses clear the
  // minimum-review threshold and show a real public rating.
  const reviewSeeds: Array<[string, string, number, string]> = [
    [customers[0].id, "BrightPaint Co.", 5, "Crew showed up on time and the paint job still looks brand new a year later."],
    [customers[1].id, "BrightPaint Co.", 5, "Great prep work, cleaned up after themselves every day."],
    [customers[0].id, "PixelForge Studio", 4, "Delivered on schedule, minor revisions needed after launch but handled quickly."],
    [customers[1].id, "PixelForge Studio", 5, "Best web team we've worked with, very responsive."],
    [customers[1].id, "PixelForge Studio", 4, "Solid work, would hire again."],
  ];

  for (const [customerId, companyName, rating, comment] of reviewSeeds) {
    const business = byCompany(companyName);
    await prisma.review.upsert({
      where: { businessId_customerId: { businessId: business.id, customerId } },
      update: {},
      create: { businessId: business.id, customerId, rating, comment },
    });
  }

  console.log("Seed complete.");
  console.log("Demo login (all users): password123");
  console.log(`Admin: ${admin.email}`);
  console.log(`Customers: ${customers.map((c) => c.email).join(", ")}`);
  console.log(
    `Businesses: ${businessSeeds
      .filter((b) => b.email)
      .map((b) => b.email)
      .join(", ")} (plus ${businessSeeds.filter((b) => !b.email).length} unclaimed directory listings)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
