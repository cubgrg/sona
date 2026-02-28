import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with hospitality data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Locations ---
  const downtown = await prisma.location.upsert({
    where: { name: 'The Golden Fork - Downtown' },
    update: {},
    create: { name: 'The Golden Fork - Downtown', address: '42 Main Street, Downtown' },
  });

  const waterfront = await prisma.location.upsert({
    where: { name: 'The Golden Fork - Waterfront' },
    update: {},
    create: { name: 'The Golden Fork - Waterfront', address: '15 Harbour Drive, Waterfront' },
  });

  const midtown = await prisma.location.upsert({
    where: { name: 'The Golden Fork - Midtown' },
    update: {},
    create: { name: 'The Golden Fork - Midtown', address: '88 Central Avenue, Midtown' },
  });

  console.log('  Locations created: Downtown, Waterfront, Midtown');

  // --- Users ---
  const maria = await prisma.user.upsert({
    where: { email: 'maria@goldenfork.com' },
    update: { displayName: 'Maria Santos', role: 'manager', locationId: downtown.id },
    create: {
      email: 'maria@goldenfork.com', passwordHash, displayName: 'Maria Santos',
      role: 'manager', locationId: downtown.id, status: 'online',
    },
  });

  const james = await prisma.user.upsert({
    where: { email: 'james@goldenfork.com' },
    update: { displayName: 'James Chen', role: 'chef', locationId: downtown.id },
    create: {
      email: 'james@goldenfork.com', passwordHash, displayName: 'James Chen',
      role: 'chef', locationId: downtown.id, status: 'offline',
    },
  });

  const sophie = await prisma.user.upsert({
    where: { email: 'test123@goldenfork.com' },
    update: { displayName: 'Sophie Williams', role: 'server', locationId: downtown.id },
    create: {
      email: 'test123@goldenfork.com', passwordHash, displayName: 'Sophie Williams',
      role: 'server', locationId: downtown.id, status: 'offline',
    },
  });

  const kai = await prisma.user.upsert({
    where: { email: 'kai@goldenfork.com' },
    update: { displayName: 'Kai Nakamura', role: 'bartender', locationId: downtown.id },
    create: {
      email: 'kai@goldenfork.com', passwordHash, displayName: 'Kai Nakamura',
      role: 'bartender', locationId: downtown.id, status: 'offline',
    },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya@goldenfork.com' },
    update: { displayName: 'Priya Patel', role: 'manager', locationId: waterfront.id },
    create: {
      email: 'priya@goldenfork.com', passwordHash, displayName: 'Priya Patel',
      role: 'manager', locationId: waterfront.id, status: 'offline',
    },
  });

  const tom = await prisma.user.upsert({
    where: { email: 'tom@goldenfork.com' },
    update: { displayName: "Tom O'Brien", role: 'chef', locationId: waterfront.id },
    create: {
      email: 'tom@goldenfork.com', passwordHash, displayName: "Tom O'Brien",
      role: 'chef', locationId: waterfront.id, status: 'offline',
    },
  });

  const aisha = await prisma.user.upsert({
    where: { email: 'aisha@goldenfork.com' },
    update: { displayName: 'Aisha Mohammed', role: 'server', locationId: waterfront.id },
    create: {
      email: 'aisha@goldenfork.com', passwordHash, displayName: 'Aisha Mohammed',
      role: 'server', locationId: waterfront.id, status: 'offline',
    },
  });

  const luca = await prisma.user.upsert({
    where: { email: 'luca@goldenfork.com' },
    update: { displayName: 'Luca Rossi', role: 'kitchen_staff', locationId: waterfront.id },
    create: {
      email: 'luca@goldenfork.com', passwordHash, displayName: 'Luca Rossi',
      role: 'kitchen_staff', locationId: waterfront.id, status: 'offline',
    },
  });

  const emma = await prisma.user.upsert({
    where: { email: 'emma@goldenfork.com' },
    update: { displayName: 'Emma Davis', role: 'host', locationId: midtown.id },
    create: {
      email: 'emma@goldenfork.com', passwordHash, displayName: 'Emma Davis',
      role: 'host', locationId: midtown.id, status: 'offline',
    },
  });

  const ryan = await prisma.user.upsert({
    where: { email: 'ryan@goldenfork.com' },
    update: { displayName: 'Ryan Kim', role: 'server', locationId: midtown.id },
    create: {
      email: 'ryan@goldenfork.com', passwordHash, displayName: 'Ryan Kim',
      role: 'server', locationId: midtown.id, status: 'offline',
    },
  });

  const allUsers = [maria, james, sophie, kai, priya, tom, aisha, luca, emma, ryan];
  console.log('  Users created:', allUsers.map(u => u.displayName).join(', '));

  // --- Channels ---
  const general = await prisma.channel.upsert({
    where: { name: 'general' },
    update: {},
    create: { name: 'general', description: 'Company-wide announcements and updates', createdBy: maria.id },
  });

  const kitchen = await prisma.channel.upsert({
    where: { name: 'kitchen' },
    update: {},
    create: { name: 'kitchen', description: 'Kitchen coordination and prep lists', createdBy: james.id },
  });

  const foh = await prisma.channel.upsert({
    where: { name: 'front-of-house' },
    update: {},
    create: { name: 'front-of-house', description: 'Service floor updates and table management', createdBy: sophie.id },
  });

  const managers = await prisma.channel.upsert({
    where: { name: 'managers' },
    update: {},
    create: { name: 'managers', description: 'Management team discussions', isPrivate: true, createdBy: maria.id },
  });

  console.log('  Channels created: general, kitchen, front-of-house, managers');

  // --- Channel memberships ---
  const memberships = [
    // #general — everyone
    ...allUsers.map(u => ({ channelId: general.id, userId: u.id, role: u.id === maria.id ? 'admin' : 'member' })),
    // #kitchen — chefs, kitchen staff, managers
    { channelId: kitchen.id, userId: james.id, role: 'admin' },
    { channelId: kitchen.id, userId: tom.id, role: 'member' },
    { channelId: kitchen.id, userId: luca.id, role: 'member' },
    { channelId: kitchen.id, userId: maria.id, role: 'member' },
    { channelId: kitchen.id, userId: priya.id, role: 'member' },
    // #front-of-house — servers, bartender, host, managers
    { channelId: foh.id, userId: sophie.id, role: 'admin' },
    { channelId: foh.id, userId: kai.id, role: 'member' },
    { channelId: foh.id, userId: aisha.id, role: 'member' },
    { channelId: foh.id, userId: emma.id, role: 'member' },
    { channelId: foh.id, userId: ryan.id, role: 'member' },
    { channelId: foh.id, userId: maria.id, role: 'member' },
    { channelId: foh.id, userId: priya.id, role: 'member' },
    // #managers — private
    { channelId: managers.id, userId: maria.id, role: 'admin' },
    { channelId: managers.id, userId: priya.id, role: 'admin' },
  ];

  for (const m of memberships) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: m.channelId, userId: m.userId } },
      update: {},
      create: m,
    });
  }

  console.log('  Channel memberships set up');

  // --- Helper ---
  function timeAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60_000);
  }

  function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // --- Shifts (next 7 days) ---
  interface ShiftDef {
    employeeId: string;
    locationId: string;
    role: string;
    pattern: { dayOffset: number; start: string; end: string }[];
  }

  const shiftDefs: ShiftDef[] = [
    { employeeId: maria.id, locationId: downtown.id, role: 'manager', pattern: [
      { dayOffset: 0, start: '08:00', end: '16:00' }, { dayOffset: 1, start: '08:00', end: '16:00' },
      { dayOffset: 2, start: '08:00', end: '16:00' }, { dayOffset: 3, start: '08:00', end: '16:00' },
      { dayOffset: 4, start: '08:00', end: '16:00' },
    ]},
    { employeeId: james.id, locationId: downtown.id, role: 'chef', pattern: [
      { dayOffset: 0, start: '06:00', end: '14:00' }, { dayOffset: 1, start: '06:00', end: '14:00' },
      { dayOffset: 2, start: '14:00', end: '22:00' }, { dayOffset: 3, start: '14:00', end: '22:00' },
      { dayOffset: 5, start: '06:00', end: '14:00' },
    ]},
    { employeeId: sophie.id, locationId: downtown.id, role: 'server', pattern: [
      { dayOffset: 0, start: '10:00', end: '15:00' }, { dayOffset: 1, start: '17:00', end: '23:00' },
      { dayOffset: 2, start: '10:00', end: '15:00' }, { dayOffset: 4, start: '17:00', end: '23:00' },
      { dayOffset: 5, start: '17:00', end: '23:00' },
    ]},
    { employeeId: kai.id, locationId: downtown.id, role: 'bartender', pattern: [
      { dayOffset: 0, start: '16:00', end: '00:00' }, { dayOffset: 2, start: '16:00', end: '00:00' },
      { dayOffset: 3, start: '16:00', end: '00:00' }, { dayOffset: 4, start: '16:00', end: '00:00' },
      { dayOffset: 5, start: '16:00', end: '00:00' },
    ]},
    { employeeId: priya.id, locationId: waterfront.id, role: 'manager', pattern: [
      { dayOffset: 0, start: '09:00', end: '17:00' }, { dayOffset: 1, start: '09:00', end: '17:00' },
      { dayOffset: 2, start: '09:00', end: '17:00' }, { dayOffset: 4, start: '09:00', end: '17:00' },
      { dayOffset: 5, start: '09:00', end: '17:00' },
    ]},
    { employeeId: tom.id, locationId: waterfront.id, role: 'chef', pattern: [
      { dayOffset: 0, start: '07:00', end: '15:00' }, { dayOffset: 1, start: '14:00', end: '22:00' },
      { dayOffset: 3, start: '07:00', end: '15:00' }, { dayOffset: 4, start: '07:00', end: '15:00' },
      { dayOffset: 5, start: '14:00', end: '22:00' },
    ]},
    { employeeId: aisha.id, locationId: waterfront.id, role: 'server', pattern: [
      { dayOffset: 1, start: '11:00', end: '16:00' }, { dayOffset: 2, start: '17:00', end: '23:00' },
      { dayOffset: 3, start: '11:00', end: '16:00' }, { dayOffset: 4, start: '17:00', end: '23:00' },
      { dayOffset: 6, start: '11:00', end: '16:00' },
    ]},
    { employeeId: luca.id, locationId: waterfront.id, role: 'kitchen_staff', pattern: [
      { dayOffset: 0, start: '08:00', end: '16:00' }, { dayOffset: 1, start: '08:00', end: '16:00' },
      { dayOffset: 2, start: '08:00', end: '16:00' }, { dayOffset: 3, start: '08:00', end: '16:00' },
      { dayOffset: 5, start: '08:00', end: '16:00' },
    ]},
    { employeeId: emma.id, locationId: midtown.id, role: 'host', pattern: [
      { dayOffset: 0, start: '11:00', end: '19:00' }, { dayOffset: 1, start: '11:00', end: '19:00' },
      { dayOffset: 3, start: '11:00', end: '19:00' }, { dayOffset: 4, start: '11:00', end: '19:00' },
      { dayOffset: 5, start: '11:00', end: '19:00' },
    ]},
    { employeeId: ryan.id, locationId: midtown.id, role: 'server', pattern: [
      { dayOffset: 0, start: '17:00', end: '23:00' }, { dayOffset: 1, start: '10:00', end: '15:00' },
      { dayOffset: 2, start: '17:00', end: '23:00' }, { dayOffset: 4, start: '17:00', end: '23:00' },
      { dayOffset: 5, start: '10:00', end: '15:00' },
    ]},
  ];

  for (const def of shiftDefs) {
    for (const p of def.pattern) {
      await prisma.shift.create({
        data: {
          employeeId: def.employeeId,
          locationId: def.locationId,
          date: daysFromNow(p.dayOffset),
          startTime: p.start,
          endTime: p.end,
          role: def.role,
        },
      });
    }
  }

  console.log('  Shifts seeded (next 7 days)');

  // --- #general messages ---
  const g1 = await prisma.message.create({
    data: {
      content: "Welcome to The Golden Fork team chat! This is our new way to stay connected across all locations. If you need anything, don't hesitate to reach out here.",
      authorId: maria.id, channelId: general.id, createdAt: timeAgo(2000),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Great to have everyone in one place! Much better than juggling multiple WhatsApp groups.',
      authorId: priya.id, channelId: general.id, createdAt: timeAgo(1950),
    },
  });

  await prisma.message.create({
    data: {
      content: "Reminder: the new summer menu launches next Monday. Training sessions this Thursday and Friday at each location. Check your shifts for the time.",
      authorId: maria.id, channelId: general.id, createdAt: timeAgo(500),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Looking forward to it! The tasting we did last week was incredible.',
      authorId: sophie.id, channelId: general.id, createdAt: timeAgo(480),
    },
  });

  const g5 = await prisma.message.create({
    data: {
      content: 'Staff BBQ this Saturday at the Waterfront location! Families welcome. Let me know if you can make it.',
      authorId: priya.id, channelId: general.id, createdAt: timeAgo(200),
    },
  });

  await prisma.message.create({
    data: {
      content: "Count me in! I'll bring my famous potato salad.",
      authorId: tom.id, channelId: general.id, createdAt: timeAgo(190),
    },
  });

  await prisma.message.create({
    data: {
      content: "I'll be there with the family!",
      authorId: james.id, channelId: general.id, createdAt: timeAgo(185),
    },
  });

  // Thread on welcome message
  await prisma.message.create({
    data: {
      content: 'This is so much easier than texting! How do I set up notifications?',
      authorId: emma.id, channelId: general.id, threadParentId: g1.id, createdAt: timeAgo(1900),
    },
  });

  await prisma.message.create({
    data: {
      content: "They should be on by default. You'll get a notification for any channel you're in. Let me know if you have issues!",
      authorId: maria.id, channelId: general.id, threadParentId: g1.id, createdAt: timeAgo(1890),
    },
  });

  // Thread on BBQ
  await prisma.message.create({
    data: {
      content: 'What time does it start?',
      authorId: kai.id, channelId: general.id, threadParentId: g5.id, createdAt: timeAgo(188),
    },
  });

  await prisma.message.create({
    data: {
      content: '2pm! We have the patio reserved until 6.',
      authorId: priya.id, channelId: general.id, threadParentId: g5.id, createdAt: timeAgo(186),
    },
  });

  console.log('  #general messages + threads seeded');

  // --- #kitchen messages ---
  const k1 = await prisma.message.create({
    data: {
      content: "Prep list for tonight: 50 covers expected. We need extra mise en place on the starters. Luca, can you handle the cold station prep by 3pm?",
      authorId: james.id, channelId: kitchen.id, createdAt: timeAgo(300),
    },
  });

  await prisma.message.create({
    data: {
      content: "On it, chef. I'll start with the gazpacho base and work through the salad components.",
      authorId: luca.id, channelId: kitchen.id, createdAt: timeAgo(290),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Waterfront had a great Friday rush. 78 covers, kitchen ran smooth. Good work Tom and Luca!',
      authorId: priya.id, channelId: kitchen.id, createdAt: timeAgo(150),
    },
  });

  await prisma.message.create({
    data: {
      content: "Heads up: the halibut delivery is running late. Won't arrive until noon. We may need to 86 it for lunch service.",
      authorId: tom.id, channelId: kitchen.id, createdAt: timeAgo(100),
    },
  });

  await prisma.message.create({
    data: {
      content: "Good call. I'll swap it with the sea bass special. Maria, can you update the board?",
      authorId: james.id, channelId: kitchen.id, createdAt: timeAgo(95),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Done! Board updated.',
      authorId: maria.id, channelId: kitchen.id, createdAt: timeAgo(90),
    },
  });

  // Thread on prep list
  await prisma.message.create({
    data: {
      content: 'Also, we are running low on shallots. Can we add that to the order?',
      authorId: luca.id, channelId: kitchen.id, threadParentId: k1.id, createdAt: timeAgo(285),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Added. Order goes out at 4pm. Anything else?',
      authorId: james.id, channelId: kitchen.id, threadParentId: k1.id, createdAt: timeAgo(280),
    },
  });

  console.log('  #kitchen messages + threads seeded');

  // --- #front-of-house messages ---
  await prisma.message.create({
    data: {
      content: "Tonight's reservation list is looking packed. 12 tables booked between 7-8pm. Let's make sure sections are balanced.",
      authorId: sophie.id, channelId: foh.id, createdAt: timeAgo(250),
    },
  });

  await prisma.message.create({
    data: {
      content: "I can take the patio section tonight. The weather's supposed to be perfect.",
      authorId: aisha.id, channelId: foh.id, createdAt: timeAgo(240),
    },
  });

  await prisma.message.create({
    data: {
      content: "Perfect. Kai, can you prep the cocktail specials for tonight? We're pushing the new summer drinks.",
      authorId: maria.id, channelId: foh.id, createdAt: timeAgo(230),
    },
  });

  await prisma.message.create({
    data: {
      content: "Already on it! I've got the elderflower spritz and the smoked pineapple margarita ready to go.",
      authorId: kai.id, channelId: foh.id, createdAt: timeAgo(225),
    },
  });

  await prisma.message.create({
    data: {
      content: "Midtown is fully booked for Saturday brunch. Emma, do we need an extra server?",
      authorId: priya.id, channelId: foh.id, createdAt: timeAgo(120),
    },
  });

  await prisma.message.create({
    data: {
      content: "Yes please! We had a 30-minute wait last Saturday. Ryan, are you available for the morning shift?",
      authorId: emma.id, channelId: foh.id, createdAt: timeAgo(115),
    },
  });

  await prisma.message.create({
    data: {
      content: "I can do 9-2. Just let me know!",
      authorId: ryan.id, channelId: foh.id, createdAt: timeAgo(110),
    },
  });

  console.log('  #front-of-house messages seeded');

  // --- #managers messages ---
  await prisma.message.create({
    data: {
      content: 'Monthly numbers are in. Downtown up 12%, Waterfront up 8%, Midtown holding steady. Great work across the board.',
      authorId: maria.id, channelId: managers.id, createdAt: timeAgo(400),
    },
  });

  await prisma.message.create({
    data: {
      content: "Waterfront's uptick is largely from the new weekend brunch. We should consider rolling that out to the other locations.",
      authorId: priya.id, channelId: managers.id, createdAt: timeAgo(390),
    },
  });

  await prisma.message.create({
    data: {
      content: "Agreed. Let's discuss at our next sync. Also, employee of the month nominations are due Friday.",
      authorId: maria.id, channelId: managers.id, createdAt: timeAgo(380),
    },
  });

  await prisma.message.create({
    data: {
      content: "I'm nominating Sophie. Her customer satisfaction scores have been consistently top across all locations.",
      authorId: priya.id, channelId: managers.id, createdAt: timeAgo(370),
    },
  });

  console.log('  #managers messages seeded');

  // --- DM Conversations ---
  // Maria <-> James
  const dmMariaJames = await prisma.conversation.create({
    data: { members: { create: [{ userId: maria.id }, { userId: james.id }] } },
  });

  await prisma.message.create({
    data: {
      content: "James, the food critic from the Herald is coming in this Thursday. Can we do something special?",
      authorId: maria.id, conversationId: dmMariaJames.id, createdAt: timeAgo(160),
    },
  });

  await prisma.message.create({
    data: {
      content: "Absolutely. I'll prep the tasting menu with the new summer dishes. Should impress.",
      authorId: james.id, conversationId: dmMariaJames.id, createdAt: timeAgo(155),
    },
  });

  await prisma.message.create({
    data: {
      content: "Perfect. Let's seat them at table 7, best view in the house.",
      authorId: maria.id, conversationId: dmMariaJames.id, createdAt: timeAgo(150),
    },
  });

  console.log('  DM: Maria <-> James seeded');

  // Maria <-> Priya
  const dmMariaPriya = await prisma.conversation.create({
    data: { members: { create: [{ userId: maria.id }, { userId: priya.id }] } },
  });

  await prisma.message.create({
    data: {
      content: 'How is the new POS system working out at Waterfront?',
      authorId: maria.id, conversationId: dmMariaPriya.id, createdAt: timeAgo(350),
    },
  });

  await prisma.message.create({
    data: {
      content: 'Really well actually. Order times are down 20% and the servers love the new interface. Should be an easy rollout to Downtown.',
      authorId: priya.id, conversationId: dmMariaPriya.id, createdAt: timeAgo(340),
    },
  });

  await prisma.message.create({
    data: {
      content: "That's great to hear. Let's plan the Downtown rollout for next month.",
      authorId: maria.id, conversationId: dmMariaPriya.id, createdAt: timeAgo(335),
    },
  });

  console.log('  DM: Maria <-> Priya seeded');

  // Sophie <-> Kai
  const dmSophieKai = await prisma.conversation.create({
    data: { members: { create: [{ userId: sophie.id }, { userId: kai.id }] } },
  });

  await prisma.message.create({
    data: {
      content: 'Hey Kai, any chance you could cover my Thursday evening? I have a family thing.',
      authorId: sophie.id, conversationId: dmSophieKai.id, createdAt: timeAgo(80),
    },
  });

  await prisma.message.create({
    data: {
      content: "I'm already on bar duty Thursday but I can check if Ryan is free. Want me to ask?",
      authorId: kai.id, conversationId: dmSophieKai.id, createdAt: timeAgo(75),
    },
  });

  await prisma.message.create({
    data: {
      content: 'That would be amazing, thanks!',
      authorId: sophie.id, conversationId: dmSophieKai.id, createdAt: timeAgo(73),
    },
  });

  console.log('  DM: Sophie <-> Kai seeded');

  // --- Feed Posts ---
  const announcementPost = await prisma.feedPost.create({
    data: {
      authorId: maria.id, type: 'announcement',
      title: 'New Summer Menu Launching Next Monday!',
      content: "Exciting news! Our new summer menu launches next Monday across all locations. Training sessions are scheduled for Thursday and Friday this week. Please review the new dishes in advance and come prepared with questions. This menu features locally sourced ingredients and three new vegan options.",
      locationScope: 'all', createdAt: timeAgo(600),
    },
  });

  await prisma.feedPost.create({
    data: {
      authorId: priya.id, type: 'event',
      title: 'Staff BBQ — This Saturday!',
      content: "You're all invited to our summer staff BBQ at the Waterfront location this Saturday from 2pm-6pm. Families and partners welcome! We'll have food, drinks, and lawn games. It's a great chance to hang out with colleagues from other locations. RSVP in #general so we know numbers.",
      locationScope: 'all', createdAt: timeAgo(400),
    },
  });

  await prisma.feedPost.create({
    data: {
      authorId: maria.id, type: 'employee_of_month',
      title: 'Employee of the Month — Sophie Williams!',
      content: "Congratulations to Sophie Williams from our Downtown location! Sophie has consistently received outstanding customer feedback and her satisfaction scores are the highest across all three locations. Her positive energy and dedication to service excellence make her a true Golden Fork star. Well deserved, Sophie!",
      locationScope: 'all', createdAt: timeAgo(300),
    },
  });

  await prisma.feedPost.create({
    data: {
      authorId: priya.id, type: 'policy_update',
      title: 'Updated Uniform Policy',
      content: "Quick update on uniforms: new branded aprons are arriving next week. Please return your old aprons to your location manager by Friday. The new design is more comfortable and has an extra pocket — feedback from the team was heard! Each staff member will receive two.",
      locationScope: 'all', createdAt: timeAgo(200),
    },
  });

  console.log('  Feed posts seeded');

  // --- Praise ---
  // James -> Luca
  const praiseFeedPost1 = await prisma.feedPost.create({
    data: {
      authorId: james.id, type: 'praise',
      content: 'Incredible prep work during the Friday rush. Kitchen ran like clockwork thanks to Luca!',
      locationScope: downtown.id, createdAt: timeAgo(100),
    },
  });
  await prisma.praise.create({
    data: {
      fromUserId: james.id, toUserId: luca.id,
      message: 'Incredible prep work during the Friday rush. Kitchen ran like clockwork.',
      category: 'teamwork', feedPostId: praiseFeedPost1.id,
    },
  });

  // Sophie -> Kai
  const praiseFeedPost2 = await prisma.feedPost.create({
    data: {
      authorId: sophie.id, type: 'praise',
      content: 'Thanks for covering my section when I had to handle that large party. True team player!',
      locationScope: downtown.id, createdAt: timeAgo(80),
    },
  });
  await prisma.praise.create({
    data: {
      fromUserId: sophie.id, toUserId: kai.id,
      message: 'Thanks for covering my section when I had to handle that large party. True team player!',
      category: 'teamwork', feedPostId: praiseFeedPost2.id,
    },
  });

  // Maria -> Tom
  const praiseFeedPost3 = await prisma.feedPost.create({
    data: {
      authorId: maria.id, type: 'praise',
      content: "The new specials are getting rave reviews. Tom's creativity is what makes us stand out!",
      locationScope: waterfront.id, createdAt: timeAgo(60),
    },
  });
  await prisma.praise.create({
    data: {
      fromUserId: maria.id, toUserId: tom.id,
      message: 'The new specials are getting rave reviews. Your creativity is what makes us stand out.',
      category: 'above_and_beyond', feedPostId: praiseFeedPost3.id,
    },
  });

  // Priya -> Aisha
  const praiseFeedPost4 = await prisma.feedPost.create({
    data: {
      authorId: priya.id, type: 'praise',
      content: 'Three 5-star reviews this week all mentioning Aisha by name. Amazing customer service!',
      locationScope: waterfront.id, createdAt: timeAgo(40),
    },
  });
  await prisma.praise.create({
    data: {
      fromUserId: priya.id, toUserId: aisha.id,
      message: 'Three 5-star reviews this week all mentioning your service by name. Amazing work!',
      category: 'customer_service', feedPostId: praiseFeedPost4.id,
    },
  });

  console.log('  Praise records seeded');

  // --- Feed reactions ---
  await prisma.feedReaction.createMany({
    data: [
      { userId: sophie.id, feedPostId: announcementPost.id, emoji: '🎉' },
      { userId: kai.id, feedPostId: announcementPost.id, emoji: '🎉' },
      { userId: james.id, feedPostId: announcementPost.id, emoji: '👍' },
      { userId: tom.id, feedPostId: praiseFeedPost1.id, emoji: '👏' },
      { userId: maria.id, feedPostId: praiseFeedPost1.id, emoji: '❤️' },
      { userId: priya.id, feedPostId: praiseFeedPost4.id, emoji: '🌟' },
      { userId: maria.id, feedPostId: praiseFeedPost4.id, emoji: '👏' },
    ],
  });

  console.log('  Feed reactions seeded');

  // --- Hourly Rates & Pay Periods ---
  const hourlyRates: Record<string, number> = {
    manager: 28,
    chef: 24,
    server: 18,
    bartender: 20,
    host: 16,
    kitchen_staff: 17,
  };

  for (const user of allUsers) {
    const rate = hourlyRates[user.role] ?? 18;
    await prisma.user.update({
      where: { id: user.id },
      data: { hourlyRate: rate },
    });
  }

  // Pay periods: biweekly. Last period (paid), current period (pending, pay date ~1 week from now)
  const now = new Date();
  const lastPeriodStart = new Date(now);
  lastPeriodStart.setDate(now.getDate() - 28);
  lastPeriodStart.setHours(0, 0, 0, 0);
  const lastPeriodEnd = new Date(lastPeriodStart);
  lastPeriodEnd.setDate(lastPeriodStart.getDate() + 13);
  const lastPayDate = new Date(lastPeriodEnd);
  lastPayDate.setDate(lastPeriodEnd.getDate() + 5);

  const currentPeriodStart = new Date(lastPeriodEnd);
  currentPeriodStart.setDate(lastPeriodEnd.getDate() + 1);
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setDate(currentPeriodStart.getDate() + 13);
  const currentPayDate = new Date(currentPeriodEnd);
  currentPayDate.setDate(currentPeriodEnd.getDate() + 5);

  for (const user of allUsers) {
    const rate = hourlyRates[user.role] ?? 18;
    // Last period: paid, ~38 hours
    const lastHours = 36 + Math.round(Math.random() * 8);
    const lastGross = lastHours * rate;
    const lastNet = Math.round(lastGross * 0.78 * 100) / 100;
    await prisma.payPeriod.create({
      data: {
        employeeId: user.id,
        startDate: lastPeriodStart,
        endDate: lastPeriodEnd,
        payDate: lastPayDate,
        hoursWorked: lastHours,
        hourlyRate: rate,
        grossPay: lastGross,
        netPay: lastNet,
        status: 'paid',
      },
    });

    // Current period: pending, ~35 hours so far
    const currentHours = 32 + Math.round(Math.random() * 8);
    const currentGross = currentHours * rate;
    const currentNet = Math.round(currentGross * 0.78 * 100) / 100;
    await prisma.payPeriod.create({
      data: {
        employeeId: user.id,
        startDate: currentPeriodStart,
        endDate: currentPeriodEnd,
        payDate: currentPayDate,
        hoursWorked: currentHours,
        hourlyRate: rate,
        grossPay: currentGross,
        netPay: currentNet,
        status: 'pending',
      },
    });
  }

  console.log('  Pay periods seeded (1 paid + 1 pending per employee)');

  console.log('\nSeed complete!');
  console.log('  Login as Maria (manager, Downtown):   maria@goldenfork.com / password123');
  console.log('  Login as James (chef, Downtown):       james@goldenfork.com / password123');
  console.log('  Login as Sophie (server, Downtown):    test123@goldenfork.com / password123');
  console.log('  Login as Kai (bartender, Downtown):    kai@goldenfork.com / password123');
  console.log('  Login as Priya (manager, Waterfront):  priya@goldenfork.com / password123');
  console.log('  Login as Tom (chef, Waterfront):       tom@goldenfork.com / password123');
  console.log('  Login as Aisha (server, Waterfront):   aisha@goldenfork.com / password123');
  console.log('  Login as Luca (kitchen, Waterfront):   luca@goldenfork.com / password123');
  console.log('  Login as Emma (host, Midtown):         emma@goldenfork.com / password123');
  console.log('  Login as Ryan (server, Midtown):       ryan@goldenfork.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
