// ============================================================
// POST /api/auth/on-signup
// ============================================================
// Called by the client immediately after a successful Firebase
// Auth signup. Verifies the ID token, then creates the initial
// profile and reliability documents via the Admin SDK (which
// bypasses Security Rules).
//
// This is necessary because:
// 1. The reliability collection is client-deny-all
// 2. We want atomic server-side doc creation with defaults
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { Collections } from '@/types/database';
import { FieldValue } from 'firebase-admin/firestore';

interface SignupBody {
  idToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupBody;

    if (!body.idToken || typeof body.idToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid idToken' },
        { status: 400 },
      );
    }

    // Initialize Admin SDK lazily
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the ID token
    const decoded = await adminAuth.verifyIdToken(body.idToken);
    const uid = decoded.uid;

    // Check if profile already exists (idempotent)
    const profileRef = adminDb.collection(Collections.PROFILES).doc(uid);
    const existing = await profileRef.get();

    if (!existing.exists) {
      // Create profile and reliability docs atomically
      const batch = adminDb.batch();

      // Minimal profile — user will fill in details during onboarding
      batch.set(profileRef, {
        displayName: '',
        age: 0,
        gender: '',
        genderPref: [],
        ageMinPref: 18,
        ageMaxPref: 99,
        segment: 'other',
        intentModes: [],
        seriousness: 'casual',
        matchWithinSegment: false,
        state: '',
        metro: '',
        city: '',
        lat: 0,
        lng: 0,
        bio: '',
        photoUrl: null,
        verified: false,
        status: 'active',
        communityId: null,
        availability: {},
        createdAt: FieldValue.serverTimestamp(),
      });

      // Reliability doc — server-only, tracks no-shows
      const reliabilityRef = adminDb.collection(Collections.RELIABILITY).doc(uid);
      batch.set(reliabilityRef, {
        profileId: uid,
        noShowCount: 0,
        completedMeets: 0,
      });

      await batch.commit();
    }

    // Set a session cookie for middleware route protection
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, { expiresIn });

    const response = NextResponse.json({ success: true, message: existing.exists ? 'Profile already exists' : 'Profile created' });
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in on-signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
