// ============================================================
// Seed Script — Development Data
// ============================================================
// Populates Firestore with test communities, profiles, matches,
// and connections for local development.
//
// Usage: npx tsx scripts/seed.ts
//
// Requires FIREBASE_ADMIN_* env vars or emulator connection.
// ============================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK — connects to emulators if FIRESTORE_EMULATOR_HOST is set
const app = getApps().length === 0
  ? initializeApp({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'kindred-app',
    })
  : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

interface SeedProfile {
  email: string;
  password: string;
  displayName: string;
  age: number;
  gender: string;
  segment: string;
  intentModes: string[];
  seriousness: string;
  city: string;
  state: string;
  metro: string;
  lat: number;
  lng: number;
  bio: string;
  answers: Record<string, string | number | string[]>;
}

async function seed() {
  console.log('🌱 Seeding Kindred development data...\n');

  // --- Communities ---
  console.log('Creating communities...');
  const communities = [
    { name: 'MIT Campus', type: 'campus', state: 'MA', metro: 'Boston', joinRule: 'open' },
    { name: 'Boston Metro', type: 'metro', state: 'MA', metro: 'Boston', joinRule: 'open' },
    { name: 'Providence Metro', type: 'metro', state: 'RI', metro: 'Providence', joinRule: 'open' },
  ];

  const communityIds: string[] = [];
  for (const comm of communities) {
    const ref = await db.collection('communities').add({
      ...comm,
      createdAt: FieldValue.serverTimestamp(),
    });
    communityIds.push(ref.id);
    console.log(`  ✓ ${comm.name} (${ref.id})`);
  }

  // --- Test Profiles ---
  console.log('\nCreating test profiles...');
  const profiles: SeedProfile[] = [
    {
      email: 'alice@test.com', password: 'testpass123',
      displayName: 'Alice', age: 22, gender: 'female',
      segment: 'student', intentModes: ['friendship'], seriousness: 'casual',
      city: 'Cambridge', state: 'MA', metro: 'Boston',
      lat: 42.3736, lng: -71.1097,
      bio: 'CS major at MIT, love hiking and board games',
      answers: {
        life_stage: 'study', social_energy: 3, ideal_hangout: 1,
        contact_rhythm: 2, core_value: 'growth', conflict_style: 'direct',
        what_you_want: 'deep', interests: ['tech', 'outdoors', 'gaming', 'reading'],
      },
    },
    {
      email: 'bob@test.com', password: 'testpass123',
      displayName: 'Bob', age: 24, gender: 'male',
      segment: 'student', intentModes: ['friendship'], seriousness: 'casual',
      city: 'Cambridge', state: 'MA', metro: 'Boston',
      lat: 42.3601, lng: -71.0942,
      bio: 'PhD student, amateur chef, always down for a hike',
      answers: {
        life_stage: 'study', social_energy: 2, ideal_hangout: 1,
        contact_rhythm: 2, core_value: 'depth', conflict_style: 'direct',
        what_you_want: 'deep', interests: ['outdoors', 'cooking', 'reading', 'music'],
      },
    },
    {
      email: 'carol@test.com', password: 'testpass123',
      displayName: 'Carol', age: 28, gender: 'female',
      segment: 'professional', intentModes: ['friendship', 'dating'], seriousness: 'serious',
      city: 'Boston', state: 'MA', metro: 'Boston',
      lat: 42.3601, lng: -71.0589,
      bio: 'Product manager, weekend rock climber',
      answers: {
        life_stage: 'career', social_energy: 3, ideal_hangout: 2,
        contact_rhythm: 1, core_value: 'loyalty', conflict_style: 'wait',
        what_you_want: 'wider', interests: ['fitness', 'outdoors', 'film', 'travel'],
      },
    },
    {
      email: 'dave@test.com', password: 'testpass123',
      displayName: 'Dave', age: 30, gender: 'male',
      segment: 'professional', intentModes: ['dating'], seriousness: 'serious',
      city: 'Somerville', state: 'MA', metro: 'Boston',
      lat: 42.3876, lng: -71.0995,
      bio: 'Engineer, music nerd, looking for something real',
      answers: {
        life_stage: 'career', social_energy: 2, ideal_hangout: 0,
        contact_rhythm: 2, core_value: 'depth', conflict_style: 'direct',
        what_you_want: 'deep', interests: ['music', 'tech', 'cooking', 'film'],
      },
    },
    {
      email: 'eve@test.com', password: 'testpass123',
      displayName: 'Eve', age: 21, gender: 'female',
      segment: 'student', intentModes: ['friendship'], seriousness: 'casual',
      city: 'Cambridge', state: 'MA', metro: 'Boston',
      lat: 42.3651, lng: -71.1045,
      bio: 'Art student, love live music and gallery crawls',
      answers: {
        life_stage: 'study', social_energy: 4, ideal_hangout: 3,
        contact_rhythm: 3, core_value: 'fun', conflict_style: 'let-go',
        what_you_want: 'activity', interests: ['art', 'music', 'film', 'crafts'],
      },
    },
    {
      email: 'frank@test.com', password: 'testpass123',
      displayName: 'Frank', age: 26, gender: 'male',
      segment: 'professional', intentModes: ['friendship'], seriousness: 'casual',
      city: 'Providence', state: 'RI', metro: 'Providence',
      lat: 41.824, lng: -71.4128,
      bio: 'Designer, just moved to Providence, looking for local friends',
      answers: {
        life_stage: 'career', social_energy: 2, ideal_hangout: 1,
        contact_rhythm: 1, core_value: 'calm', conflict_style: 'avoid',
        what_you_want: 'talk', interests: ['art', 'cooking', 'reading', 'travel'],
      },
    },
  ];

  const uids: string[] = [];

  for (const profile of profiles) {
    // Create auth user
    let user;
    try {
      user = await auth.createUser({
        email: profile.email,
        password: profile.password,
        displayName: profile.displayName,
      });
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code === 'auth/email-already-exists') {
        user = await auth.getUserByEmail(profile.email);
      } else {
        throw e;
      }
    }
    uids.push(user.uid);

    // Create profile doc
    await db.collection('profiles').doc(user.uid).set({
      displayName: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      genderPref: profile.gender === 'male' ? ['female'] : ['male'],
      ageMinPref: 18,
      ageMaxPref: 40,
      segment: profile.segment,
      intentModes: profile.intentModes,
      seriousness: profile.seriousness,
      matchWithinSegment: false,
      state: profile.state,
      metro: profile.metro,
      city: profile.city,
      lat: profile.lat,
      lng: profile.lng,
      bio: profile.bio,
      photoUrl: null,
      verified: false,
      status: 'active',
      communityId: profile.state === 'MA' ? communityIds[1] : communityIds[2],
      availability: {
        saturday: [{ start: '10:00', end: '18:00' }],
        sunday: [{ start: '10:00', end: '16:00' }],
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    // Create profile answers
    for (const [questionId, value] of Object.entries(profile.answers)) {
      await db.collection('profiles').doc(user.uid)
        .collection('profileAnswers').doc(questionId).set({
          questionId,
          value,
        });
    }

    // Create reliability doc
    await db.collection('reliability').doc(user.uid).set({
      profileId: user.uid,
      noShowCount: 0,
      completedMeets: 0,
    });

    console.log(`  ✓ ${profile.displayName} (${user.uid})`);
  }

  // --- Sample match (Alice + Bob, high compatibility) ---
  console.log('\nCreating sample match...');
  const participants = [uids[0], uids[1]].sort() as [string, string];
  const matchRef = await db.collection('matches').add({
    profileA: uids[0],
    profileB: uids[1],
    participants,
    compatScore: 78,
    status: 'connected',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`  ✓ Match: Alice + Bob (score: 78, ${matchRef.id})`);

  // --- Sample connection ---
  const now = Timestamp.now();
  const deadline = Timestamp.fromMillis(now.toMillis() + 48 * 60 * 60 * 1000);
  const connRef = await db.collection('connections').add({
    matchId: matchRef.id,
    mode: 'friendship',
    agreedSeriousness: 'casual',
    profileA: uids[0],
    profileB: uids[1],
    participants,
    openedAt: now,
    softDeadline: deadline,
    firstMessageAt: null,
    state: 'open',
    closedReason: null,
  });
  console.log(`  ✓ Connection: friendship/casual (${connRef.id})`);

  console.log('\n✅ Seed complete!');
  console.log(`   ${communities.length} communities`);
  console.log(`   ${profiles.length} profiles`);
  console.log(`   1 match + 1 connection`);
  console.log('\n   Test credentials: any email above with password "testpass123"');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
