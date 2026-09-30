const fs = require('fs');
const path = require('path');
const { db, Items, Settings, UPLOAD_DIR } = require('./db');
const { SETTING_DEFAULTS } = require('./content');
const { slugify } = require('./util');

const ph = (n, x = 50, y = 50) => ({ src: `/img/placeholders/${n}.svg`, x, y });
const inDays = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
function nextWeekday(dow, weeksAhead) { const d = new Date(); d.setDate(d.getDate() + ((7 + dow - d.getDay()) % 7) + 7 * weeksAhead); return d.toISOString().slice(0, 10); }

function copyDoc(name) {
  const src = path.join(__dirname, '..', 'seed', name);
  const dest = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(src) && !fs.existsSync(dest)) fs.copyFileSync(src, dest);
  return { src: `/uploads/${name}`, name, size: fs.existsSync(dest) ? fs.statSync(dest).size : 0 };
}

module.exports = function seed() {
  // Settings: fill any missing defaults (safe to run on every start)
  for (const [k, v] of Object.entries(SETTING_DEFAULTS)) if (Settings.get(k) === undefined) Settings.set(k, v);
  if (Settings.get('seeded')) return;

  const add = (c, data, opts = {}) => Items.create(c, { ...data }, { slug: slugify(data.title || data.name), ...opts });

  // Services
  [
    { title: 'Supported accommodation', icon: 'home', audience: 'Adults 18+ needing a safe home', summary: 'Safe, clean and fully furnished rooms across Birmingham, with bills included and support built in from day one.', body: 'Every Solace home is inspected regularly, kept to a high standard and fully furnished, so moving in is simple. Rooms come with bills included, Wi-Fi and a welcome pack.', points: ['Fully furnished rooms', 'Bills and Wi-Fi included', 'Regular property checks', 'Welcome pack on arrival'] },
    { title: 'Key-work & support planning', icon: 'compass', audience: 'All tenants', summary: 'A named key worker and a personal support plan built around your goals, reviewed together regularly.', body: 'Your key worker gets to know you, helps you set goals that matter to you and meets with you regularly to check in on progress.', points: ['Named key worker', 'Personal support plan', 'Regular 1:1 sessions', 'Risk assessment & safeguarding'] },
    { title: 'Benefits, money & tenancy skills', icon: 'key', audience: 'Tenants', summary: 'Help with Housing Benefit and Universal Credit claims, budgeting, bills and the skills to manage a tenancy.', body: 'We help tenants set up and maintain benefit claims, manage money confidently and build the everyday skills needed for a successful independent tenancy.', points: ['Benefit claims & appeals', 'Budgeting support', 'Debt advice referrals', 'Tenancy sustainment'] },
    { title: 'Health & wellbeing', icon: 'heart', audience: 'Tenants', summary: 'Registering with a GP, attending appointments and linking in with mental health and recovery services.', body: 'We support tenants to register with local health services, attend appointments and connect with specialist mental health, substance use and wellbeing services.', points: ['GP & dentist registration', 'Appointment support', 'Mental health signposting', 'Recovery service links'] },
    { title: 'Education, training & work', icon: 'briefcase', audience: 'Tenants', summary: 'Support into courses, volunteering and employment: CVs, applications, interview practice and confidence.', body: 'Whether it is a first course, a volunteering role or a return to work, we help tenants take the next step and celebrate every achievement along the way.', points: ['CV & application help', 'Courses & qualifications', 'Volunteering opportunities', 'Interview preparation'] },
    { title: 'Community activities & sport', icon: 'users', audience: 'Tenants', summary: 'Monthly activities, trips, our cricket team and badminton group, because belonging matters.', body: 'Regular activities help tenants build friendships, routine and confidence. From community lunches to cricket matches, there is always something to be part of.', points: ['Monthly activities', 'Cricket team', 'Badminton group', 'Day trips & celebrations'] },
    { title: 'Move-on support', icon: 'sun', audience: 'Tenants ready for independence', summary: 'When the time is right, we help you find, prepare for and settle into a long-term home of your own.', body: 'We work with tenants to plan their move into independent housing, from housing applications to setting up utilities, and stay in touch as they settle in.', points: ['Housing applications', 'Viewing support', 'Setting up a new home', 'Follow-up after moving'] },
  ].forEach((s, i) => add('services', s, { sort: i }));

  // Rooms (sample)
  [
    { title: 'Bright double room with garden view', ref: 'SH-101', status: 'Available now', property: 'Grove House', area: 'Handsworth', postcode: 'B21', room_type: 'Double room', rent: 'Housing Benefit eligible', available_from: inDays(0), suitable_for: 'Single adults 18+', furnished: true, bills_included: true, features: ['Double bed & wardrobe', 'Shared modern kitchen', 'Free Wi-Fi', 'Lockable door', 'Near buses into the city'], summary: 'A calm, light-filled double room in a well-kept shared house, a short walk from shops and buses.', description: 'This spacious double room looks out over the rear garden and comes fully furnished with a double bed, wardrobe, drawers and desk.\n\nThe house has a modern shared kitchen, clean bathrooms and a communal lounge. Support staff visit regularly and are always a message away.', images: [ph('bedroom-1'), ph('kitchen'), ph('lounge'), ph('house')], featured: true, sample: true },
    { title: 'Cosy single room close to amenities', ref: 'SH-102', status: 'Available now', property: 'Lozells Villa', area: 'Lozells', postcode: 'B19', room_type: 'Single room', rent: 'Housing Benefit eligible', available_from: inDays(3), suitable_for: 'Single adults 18+', furnished: true, bills_included: true, features: ['Single bed & storage', 'Shared kitchen & lounge', 'Free Wi-Fi', 'CCTV to communal areas'], summary: 'A warm, freshly decorated single room in a friendly supported house.', description: 'A freshly decorated single room with everything you need to settle in straight away. A great fit for someone looking for a quiet, supportive home.', images: [ph('bedroom-2'), ph('lounge'), ph('kitchen')], featured: true, sample: true },
    { title: 'En-suite room in newly refurbished house', ref: 'SH-103', status: 'Available soon', property: 'Villa Road House', area: 'Handsworth Wood', postcode: 'B20', room_type: 'En-suite room', rent: 'Housing Benefit eligible', available_from: inDays(14), suitable_for: 'Single adults 25+', furnished: true, bills_included: true, features: ['Private en-suite shower', 'Double bed', 'Newly refurbished', 'Free Wi-Fi', 'Garden'], summary: 'Your own en-suite in a newly refurbished house. Enquire now to reserve a viewing.', description: 'A beautifully refurbished room with its own private shower room, in a house finished to a high standard throughout.', images: [ph('bedroom-3'), ph('kitchen'), ph('house')], featured: true, sample: true },
    { title: 'Double room in quiet residential street', ref: 'SH-104', status: 'Under offer', property: 'Soho House', area: 'Soho Road', postcode: 'B21', room_type: 'Double room', rent: 'Housing Benefit eligible', available_from: inDays(7), suitable_for: 'Single adults 18+', furnished: true, bills_included: true, features: ['Double bed', 'Shared kitchen', 'Free Wi-Fi'], summary: 'A comfortable double room in a quiet street with great transport links.', description: 'A comfortable double room, currently under offer. Message us to join the waiting list for similar rooms.', images: [ph('bedroom-1', 30, 50), ph('lounge')], sample: true },
  ].forEach((r, i) => add('rooms', r, { sort: i }));

  // Events (sample)
  [
    { title: 'Community lunch', category: 'Social', date: nextWeekday(3, 1), start_time: '12:30', end_time: '14:30', location: 'Solace Housing office', capacity: 20, registration_open: true, summary: 'Our monthly get-together: good food, good company and a chance to meet new neighbours.', description: 'Join tenants and staff for a home-cooked lunch. Everyone is welcome, and dietary requirements are catered for. Just let us know when you register.', image: ph('lunch') },
    { title: 'Cricket nets & practice', category: 'Sport', date: nextWeekday(6, 1), start_time: '10:00', end_time: '12:00', location: 'Handsworth Park', capacity: 16, registration_open: true, summary: 'Batting, bowling and fielding practice with the Solace cricket team. All abilities welcome.', description: 'Whether you have played for years or never held a bat, come along. Equipment provided.', image: ph('cricket') },
    { title: 'Badminton evening', category: 'Sport', date: nextWeekday(2, 2), start_time: '18:00', end_time: '20:00', location: 'Local leisure centre', capacity: 8, registration_open: true, summary: 'Friendly doubles and coaching with our badminton group. Rackets provided.', description: 'A relaxed evening of doubles games. Spaces are limited to court availability, so book early.', image: ph('badminton') },
    { title: 'Cooking on a budget workshop', category: 'Skills & learning', date: nextWeekday(4, 3), start_time: '14:00', end_time: '16:00', location: 'Grove House kitchen', capacity: 6, registration_open: true, summary: 'Learn three easy, healthy meals for under £10, then eat what you cook.', description: 'A hands-on session covering meal planning, shopping smart and cooking simple meals from scratch.', image: ph('kitchen') },
  ].forEach((e) => add('events', { ...e, sample: true }));

  // Stories (sample)
  [
    { title: 'From first net session to first match', date: inDays(-20), category: 'Sport', person: 'M.', related_event: 'Cricket nets & practice', summary: 'Six months ago he had never played cricket. This summer he opened the batting.', body: 'When M. first came along to cricket practice he stood at the edge and watched. By the end of the season he was one of the first names on the team sheet.\n\nHe says the routine of weekly practice gave his week a shape, and the team gave him friends he looks forward to seeing.', quote: 'The team is like family now. I never miss a Saturday.', images: [ph('cricket')], consent: true },
    { title: 'Back into learning', date: inDays(-45), category: 'Education & work', person: 'S.', summary: 'Completing a Level 1 qualification and applying for her first job in years.', body: 'With help from her key worker, S. enrolled on a local college course and completed it with flying colours. She is now applying for retail roles and practising interviews with the team.', quote: 'I did not think I could do it. Now I have a certificate on my wall.', images: [ph('community')], consent: true },
    { title: 'A table full of friends', date: inDays(-70), category: 'Community', summary: 'Our monthly community lunch keeps growing and so do the friendships around it.', body: 'What started as a handful of people sharing a meal has become one of the highlights of the month, with tenants now helping to plan the menu and cook.', images: [ph('lunch')], consent: true },
  ].forEach((s) => add('stories', { ...s, sample: true }));

  // News (sample)
  [
    { title: 'Community newsletter: this month at Solace', date: inDays(-5), category: 'Newsletter', summary: 'Upcoming activities, tenant achievements, cricket results and dates for your diary.', body: 'Welcome to this month\'s newsletter.\n\n**Coming up:** community lunch, cricket nets and our new cooking-on-a-budget workshop. Book your place on the Events page.\n\n**Celebrations:** congratulations to everyone who completed a course this month.', image: ph('news') },
    { title: 'Our badminton group is growing', date: inDays(-25), category: 'News', summary: 'Weekly sessions are now running, with space for new players of every level.', body: 'Thanks to your enthusiasm, the badminton group now meets regularly. Rackets and shuttles are provided. Just bring trainers.', image: ph('badminton') },
  ].forEach((n) => add('news', { ...n, sample: true }));

  // Partners
  ['Probation services', 'Local authority housing teams', 'Hospital discharge teams', 'Community mental health teams', 'Homelessness charities', 'Substance use recovery services'].forEach((name, i) =>
    add('partners', { name, category: 'Referral agency', description: 'Replace with the organisation name, logo and a short note about how we work together.', sample: true }, { sort: i }));
  add('partners', { name: 'Solace Cricket Team', category: 'Community & sport', description: 'Our tenants\' cricket team trains weekly through the season and plays friendly matches across Birmingham. New players always welcome. No experience needed.', images: [ph('cricket'), ph('community')] }, { sort: 10 });
  add('partners', { name: 'Solace Badminton Group', category: 'Community & sport', description: 'A friendly weekly badminton session for tenants and staff, from complete beginners to confident players.', images: [ph('badminton')] }, { sort: 11 });
  add('partners', { name: 'Example accrediting body', category: 'Accrediting body', description: 'Add accreditations and professional memberships here, with their logo.' }, { published: false, sort: 20 });

  // Documents
  add('documents', { title: 'Referral form', section: 'Referrals', description: 'Complete and email to our referrals inbox.', file: copyDoc('solace-referral-form.pdf') });
  add('documents', { title: 'Charter of Rights', section: 'Charter of Rights', description: 'Your rights as a Solace Housing tenant (sample document).', file: copyDoc('solace-charter-of-rights.pdf'), sample: true });
  add('documents', { title: 'Complaints procedure', section: 'Complaints', description: 'Our full complaints procedure (sample document).', file: copyDoc('solace-complaints-procedure.pdf'), sample: true });

  Settings.set('seeded', '1');
  console.log('Seeded starter content.');
};
