import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users ---
  const passwordHash = await bcrypt.hash('password123', 10);

  // Find or create users
  const alice = await prisma.user.upsert({
    where: { email: 'test@sona.com' },
    update: { displayName: 'Alice Chen', status: 'online' },
    create: {
      email: 'test@sona.com',
      passwordHash,
      displayName: 'Alice Chen',
      status: 'online',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@sona.com' },
    update: {},
    create: {
      email: 'bob@sona.com',
      passwordHash,
      displayName: 'Bob Martinez',
      status: 'offline',
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@sona.com' },
    update: {},
    create: {
      email: 'carol@sona.com',
      passwordHash,
      displayName: 'Carol Park',
      status: 'offline',
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: 'dave@sona.com' },
    update: {},
    create: {
      email: 'dave@sona.com',
      passwordHash,
      displayName: 'Dave Johnson',
      status: 'offline',
    },
  });

  console.log('  Users created: Alice, Bob, Carol, Dave');

  // --- Channels ---
  const general = await prisma.channel.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      description: 'Company-wide announcements and chat',
      createdBy: alice.id,
    },
  });

  const engineering = await prisma.channel.upsert({
    where: { name: 'engineering' },
    update: {},
    create: {
      name: 'engineering',
      description: 'Engineering team discussions',
      createdBy: bob.id,
    },
  });

  const design = await prisma.channel.upsert({
    where: { name: 'design' },
    update: {},
    create: {
      name: 'design',
      description: 'Design reviews and feedback',
      createdBy: carol.id,
    },
  });

  const random = await prisma.channel.upsert({
    where: { name: 'random' },
    update: {},
    create: {
      name: 'random',
      description: 'Water cooler chat',
      createdBy: alice.id,
    },
  });

  console.log('  Channels created: general, engineering, design, random');

  // --- Channel memberships (upsert-safe) ---
  const memberships = [
    { channelId: general.id, userId: alice.id, role: 'admin' },
    { channelId: general.id, userId: bob.id, role: 'member' },
    { channelId: general.id, userId: carol.id, role: 'member' },
    { channelId: general.id, userId: dave.id, role: 'member' },
    { channelId: engineering.id, userId: alice.id, role: 'member' },
    { channelId: engineering.id, userId: bob.id, role: 'admin' },
    { channelId: engineering.id, userId: dave.id, role: 'member' },
    { channelId: design.id, userId: alice.id, role: 'member' },
    { channelId: design.id, userId: carol.id, role: 'admin' },
    { channelId: design.id, userId: bob.id, role: 'member' },
    { channelId: random.id, userId: alice.id, role: 'admin' },
    { channelId: random.id, userId: bob.id, role: 'member' },
    { channelId: random.id, userId: carol.id, role: 'member' },
    { channelId: random.id, userId: dave.id, role: 'member' },
  ];

  for (const m of memberships) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: m.channelId, userId: m.userId } },
      update: {},
      create: m,
    });
  }

  console.log('  Channel memberships set up');

  // --- Helper to create a message at a specific time offset ---
  function timeAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60_000);
  }

  // --- #general messages ---
  const g1 = await prisma.message.create({
    data: {
      content: 'Hey everyone! Welcome to Sona. This is our new team messaging app.',
      authorId: alice.id,
      channelId: general.id,
      createdAt: timeAgo(120),
    },
  });

  await prisma.message.create({
    data: {
      content: 'This looks great! Much cleaner than what we were using before.',
      authorId: bob.id,
      channelId: general.id,
      createdAt: timeAgo(115),
    },
  });

  const g3 = await prisma.message.create({
    data: {
      content: 'Quick reminder: sprint planning is tomorrow at 10am. Please have your tickets groomed.',
      authorId: carol.id,
      channelId: general.id,
      createdAt: timeAgo(90),
    },
  });

  await prisma.message.create({
    data: {
      content: "Sounds good, I'll have my estimates ready.",
      authorId: dave.id,
      channelId: general.id,
      createdAt: timeAgo(85),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Also, lunch is on the company this Friday. Any preferences?',
      authorId: alice.id,
      channelId: general.id,
      createdAt: timeAgo(60),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Pizza! Always pizza.',
      authorId: bob.id,
      channelId: general.id,
      createdAt: timeAgo(55),
    },
  });

  // Thread on the welcome message
  await prisma.message.create({
    data: {
      content: 'Thanks for setting this up Alice! How do threads work?',
      authorId: carol.id,
      channelId: general.id,
      threadParentId: g1.id,
      createdAt: timeAgo(110),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Just click "Reply" on any message and it opens a thread panel on the right.',
      authorId: alice.id,
      channelId: general.id,
      threadParentId: g1.id,
      createdAt: timeAgo(108),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Oh nice, that keeps the main chat clean!',
      authorId: bob.id,
      channelId: general.id,
      threadParentId: g1.id,
      createdAt: timeAgo(105),
    },
  });

  // Thread on sprint planning
  await prisma.message.create({
    data: {
      content: 'Should we include the API refactor in this sprint?',
      authorId: dave.id,
      channelId: general.id,
      threadParentId: g3.id,
      createdAt: timeAgo(88),
    },
  });

  await prisma.message.create({
    data: {
      content: "Let's discuss tomorrow. I think it depends on the scope.",
      authorId: carol.id,
      channelId: general.id,
      threadParentId: g3.id,
      createdAt: timeAgo(86),
    },
  });

  console.log('  #general messages + threads seeded');

  // --- #engineering messages ---
  const e1 = await prisma.message.create({
    data: {
      content: "I've been looking into migrating our auth to OAuth 2.0. Here's what I found so far:\n\n1. We can use Passport.js with the Google strategy\n2. Token refresh flow is well-documented\n3. Should take about 2-3 days to implement",
      authorId: bob.id,
      channelId: engineering.id,
      createdAt: timeAgo(200),
    },
  });

  await prisma.message.create({
    data: {
      content: "The new CI pipeline is finally green. Build times went from 12 minutes down to 4.",
      authorId: dave.id,
      channelId: engineering.id,
      createdAt: timeAgo(150),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Has anyone used Drizzle ORM? Thinking about it for the next microservice.',
      authorId: alice.id,
      channelId: engineering.id,
      createdAt: timeAgo(80),
    },
  });

  await prisma.message.create({
    data: {
      content: "I tried it on a side project. It's fast but the query builder takes some getting used to compared to Prisma.",
      authorId: bob.id,
      channelId: engineering.id,
      createdAt: timeAgo(75),
    },
  });

  // Thread on OAuth
  await prisma.message.create({
    data: {
      content: 'Should we support GitHub login too? Most of the team uses GitHub daily.',
      authorId: alice.id,
      channelId: engineering.id,
      threadParentId: e1.id,
      createdAt: timeAgo(195),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Good call. Passport.js supports multiple strategies so it should be straightforward to add both.',
      authorId: bob.id,
      channelId: engineering.id,
      threadParentId: e1.id,
      createdAt: timeAgo(190),
    },
  });

  await prisma.message.create({
    data: {
      content: "Let's scope it for next sprint then. I'll write up the ticket.",
      authorId: dave.id,
      channelId: engineering.id,
      threadParentId: e1.id,
      createdAt: timeAgo(185),
    },
  });

  console.log('  #engineering messages + threads seeded');

  // --- #design messages ---
  await prisma.message.create({
    data: {
      content: 'Just uploaded the new dashboard mockups to Figma. Would love feedback!',
      authorId: carol.id,
      channelId: design.id,
      createdAt: timeAgo(300),
    },
  });

  await prisma.message.create({
    data: {
      content: 'The color palette looks solid. One thought - can we bump the font size on the stats cards? They felt a bit small on my screen.',
      authorId: bob.id,
      channelId: design.id,
      createdAt: timeAgo(280),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Good catch, I updated it. Also added a dark mode variant.',
      authorId: carol.id,
      channelId: design.id,
      createdAt: timeAgo(260),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Dark mode looks amazing. The contrast ratios all pass WCAG AA.',
      authorId: alice.id,
      channelId: design.id,
      createdAt: timeAgo(240),
    },
  });

  console.log('  #design messages seeded');

  // --- #random messages ---
  await prisma.message.create({
    data: {
      content: 'Anyone up for a board game night this weekend?',
      authorId: dave.id,
      channelId: random.id,
      createdAt: timeAgo(400),
    },
  });

  await prisma.message.create({
    data: {
      content: "I'm in! I just got Wingspan, it's supposed to be really good.",
      authorId: carol.id,
      channelId: random.id,
      createdAt: timeAgo(390),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Count me in too. Saturday works best for me.',
      authorId: alice.id,
      channelId: random.id,
      createdAt: timeAgo(385),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Just discovered this coffee shop near the office - "Bean There, Done That." The pour-over is incredible.',
      authorId: bob.id,
      channelId: random.id,
      createdAt: timeAgo(100),
    },
  });

  console.log('  #random messages seeded');

  // --- DM conversations ---
  // Alice <-> Bob
  const dmAliceBob = await prisma.conversation.create({
    data: {
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      content: 'Hey Bob, do you have time for a quick code review today?',
      authorId: alice.id,
      conversationId: dmAliceBob.id,
      createdAt: timeAgo(45),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Sure! Send the PR link and I can look at it after lunch.',
      authorId: bob.id,
      conversationId: dmAliceBob.id,
      createdAt: timeAgo(40),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Perfect, just opened it. It\'s the user profile endpoint refactor.',
      authorId: alice.id,
      conversationId: dmAliceBob.id,
      createdAt: timeAgo(38),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Got it, looks clean so far. Left a couple of minor comments.',
      authorId: bob.id,
      conversationId: dmAliceBob.id,
      createdAt: timeAgo(20),
    },
  });

  console.log('  DM: Alice <-> Bob seeded');

  // Alice <-> Carol
  const dmAliceCarol = await prisma.conversation.create({
    data: {
      members: {
        create: [
          { userId: alice.id },
          { userId: carol.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      content: 'Hey Carol! The design sprint doc you shared was really helpful.',
      authorId: alice.id,
      conversationId: dmAliceCarol.id,
      createdAt: timeAgo(70),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Glad it helped! Let me know if you want to walk through the user flow together.',
      authorId: carol.id,
      conversationId: dmAliceCarol.id,
      createdAt: timeAgo(65),
    },
  });

  await prisma.message.create({
    data: {
      content: "That would be great, how about tomorrow morning?",
      authorId: alice.id,
      conversationId: dmAliceCarol.id,
      createdAt: timeAgo(62),
    },
  });

  console.log('  DM: Alice <-> Carol seeded');

  console.log('\nSeed complete!');
  console.log('  Login as Alice: test@sona.com / password123');
  console.log('  Login as Bob:   bob@sona.com / password123');
  console.log('  Login as Carol: carol@sona.com / password123');
  console.log('  Login as Dave:  dave@sona.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
