/**
 * Creates demo profiles for local testing. Never run against production.
 *   npm run seed            (around Madrid)
 *   SEED_LAT=19.43 SEED_LNG=-99.13 npm run seed   (around Mexico City)
 * Demo login: demo@lumi.app / password123
 */
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { migrate } from './migrate.js';
import { pool, query } from './pool.js';

if (config.isProd) {
  console.error('Refusing to seed a production database');
  process.exit(1);
}

const women = ['Lucía', 'Sofía', 'Emma', 'Valentina', 'Chloé', 'Mia', 'Aiko', 'Isabella', 'Yuna', 'Amara', 'Nora', 'Leila', 'Olivia', 'Camila', 'Hana', 'Zoe', 'Elena', 'Ines', 'Maya', 'Sara'];
const men = ['Mateo', 'Lucas', 'Hugo', 'Liam', 'Kenji', 'Noah', 'Diego', 'Omar', 'Leo', 'Marco', 'Ethan', 'Arjun', 'Pablo', 'Jonas', 'Adrián', 'Theo', 'Samuel', 'Daniel', 'Minho', 'Luca'];
const bios = [
  'Coffee first, adventures second ☕️', 'Looking for someone to explore new restaurants with 🍜',
  'Dog lover. Sunset chaser. Terrible at karaoke 🎤', 'Weekend hikes and bookstore dates 📚',
  'Architect by day, salsa dancer by night 💃', 'Let’s travel somewhere we can’t pronounce ✈️',
];
const interests = ['travel', 'music', 'coffee', 'hiking', 'cooking', 'art', 'yoga', 'movies', 'photography', 'dancing', 'gaming', 'wine', 'fitness', 'books', 'surf'];
const jobs = ['Designer', 'Engineer', 'Doctor', 'Photographer', 'Chef', 'Architect', 'Lawyer', 'Musician', 'Teacher', 'Founder'];

const PROMPTS: [string, string][] = [
  ['ideal_sunday', 'Farmers market, a long lunch that turns into dinner, and a film I have seen ten times.'],
  ['green_flag', 'You are kind to waiters and you remember the small things.'],
  ['best_trip', 'Two weeks in Japan with no plan. Best decision I ever made.'],
  ['simple_pleasures', 'Fresh bread, handwritten notes, the first coffee of the day.'],
  ['first_date', 'A tiny wine bar, good music, and no phones on the table.'],
  ['dating_me', 'A spontaneous weekend away — you will need comfortable shoes.'],
  ['this_year', 'Learn to sail and finally finish the book I started.'],
  ['looking_for_someone', 'Is curious, laughs easily and texts back.'],
  ['secretly_good_at', 'Parallel parking and making perfect risotto.'],
  ['two_truths', 'I have met a Pope. I speak four languages. I can juggle.'],
];

const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

async function main() {
  await migrate();
  const lat = Number(process.env.SEED_LAT ?? 40.4168);
  const lng = Number(process.env.SEED_LNG ?? -3.7038);
  const hash = await bcrypt.hash('password123', 10);
  await query(`DELETE FROM users WHERE email LIKE '%@seed.lumi.app' OR email = 'demo@lumi.app'`);

  const demo = await query(
    `INSERT INTO users (email, password_hash, name, birthdate, gender, interested_in, bio, lat, lng, job_title, interests, city)
     VALUES ('demo@lumi.app', $1, 'Alex', '1994-04-12', 'man', '{woman,man,nonbinary}', 'Demo account ✨', $2, $3, 'Product Manager', '{travel,music,coffee}', 'Demo City')
     RETURNING id`,
    [hash, lat, lng],
  );
  const demoId = demo.rows[0].id;
  await query(`INSERT INTO photos (user_id, url, position) VALUES ($1, 'https://randomuser.me/api/portraits/men/32.jpg', 0)`, [demoId]);

  const people = [
    ...women.map((name, i) => ({ name, gender: 'woman', photoBase: 'women', i })),
    ...men.map((name, i) => ({ name, gender: 'man', photoBase: 'men', i })),
  ];
  for (const [idx, p] of people.entries()) {
    const age = 21 + (idx * 7) % 18;
    const res = await query(
      `INSERT INTO users (email, password_hash, name, birthdate, gender, interested_in, bio, job_title, interests,
         lat, lng, city, height_cm, looking_for, is_verified, languages, last_active_at, prompts)
       VALUES ($1, $2, $3, make_date($4, 1 + $5 % 12, 1 + $5 % 27), $6, '{woman,man,nonbinary}', $7, $8, $9, $10, $11, 'Demo City',
         $12, $13, $14, $15, now() - ($5 || ' hours')::interval, $16)
       RETURNING id`,
      [
        `seed${idx}@seed.lumi.app`, hash, p.name, new Date().getFullYear() - age, idx, p.gender, pick(bios, idx),
        pick(jobs, idx), [pick(interests, idx), pick(interests, idx + 3), pick(interests, idx + 7)],
        lat + ((idx % 10) - 5) * 0.02, lng + ((idx % 7) - 3) * 0.02, 155 + (idx * 3) % 35,
        pick(['long_term', 'short_term', 'friendship', 'unsure'], idx), idx % 3 === 0, ['English', 'Español'],
        JSON.stringify([pick(PROMPTS, idx), pick(PROMPTS, idx + 4)].map(([id, answer]) => ({ id, answer }))),
      ],
    );
    const id = res.rows[0].id;
    for (let k = 0; k < 3; k++) {
      await query('INSERT INTO photos (user_id, url, position) VALUES ($1, $2, $3)', [
        id, `https://randomuser.me/api/portraits/${p.photoBase}/${(p.i * 3 + k * 17) % 99}.jpg`, k,
      ]);
    }
    // A third of the demo profiles already like the demo account, so matches happen quickly.
    if (idx % 3 === 0) {
      await query(`INSERT INTO swipes (swiper_id, target_id, action) VALUES ($1, $2, $3)`, [
        id, demoId, idx % 6 === 0 ? 'superlike' : 'like',
      ]);
    }
  }
  console.log(`Seeded ${people.length} profiles around (${lat}, ${lng}). Login: demo@lumi.app / password123`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
