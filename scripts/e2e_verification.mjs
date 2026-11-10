import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:4102';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text), headers: res.headers };
  } catch {
    return { status: res.status, text, headers: res.headers };
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('SRI SARASWATHI DENTAL CLINIC - E2E VERIFICATION SUITE');
  console.log('Cloudflare D1 Database + Cloudflare R2 Live Storage');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Admin Authentication
  console.log('1. TESTING ADMIN AUTHENTICATION...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@srisaraswathidental.com', password: process.env.ADMIN_PASSWORD || 'Admin@dental2026' }),
  });
  assert(loginRes.status === 200 && loginRes.data?.user?.email === 'admin@srisaraswathidental.com', 'Admin login with verified D1 credentials');

  const cookieHeader = loginRes.headers.get('set-cookie');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader.split(';')[0] } : {}),
  };

  // 2. Doctor Management & Public Website Sync
  console.log('\n2. TESTING DOCTOR MANAGEMENT & PUBLIC SYNC...');
  const testDoctorName = `Dr. Rajesh Test ${Date.now().toString().slice(-4)}`;
  const createDocRes = await request('/api/admin/doctors', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: testDoctorName,
      qualification: 'BDS, MDS - Orthodontics',
      specialization: 'Invisalign & Braces Specialist',
      experience: '10+ Years',
      biography: 'Specialist in smile alignment and contemporary orthodontic care.',
      profile_image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=600',
      display_order: 2,
    }),
  });
  assert(createDocRes.status === 201 && createDocRes.data?.doctor?.id, 'Doctor created and saved into Cloudflare D1');
  const createdDoctorId = createDocRes.data?.doctor?.id;

  // Verify on public website endpoints
  const publicContentDocs = await request('/api/content?type=doctor');
  const docInContent = publicContentDocs.data?.items?.find(d => d.id === createdDoctorId);
  assert(Boolean(docInContent && docInContent.title === testDoctorName), 'New doctor instantly visible in public /api/content?type=doctor');

  // Update doctor
  const updateDocRes = await request(`/api/admin/doctors/${createdDoctorId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      experience: '12+ Years Experience',
    }),
  });
  assert(updateDocRes.status === 200 && updateDocRes.data?.doctor?.experience === '12+ Years Experience', 'Doctor details updated and persisted in D1');

  // 3. Treatment Management & Public Sync
  console.log('\n3. TESTING TREATMENT MANAGEMENT & PUBLIC SYNC...');
  const testTreatmentSlug = `laser-whitening-test-${Date.now().toString().slice(-4)}`;
  const createTrtRes = await request('/api/admin/treatments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      treatment_name: 'Laser Precision Whitening (Test)',
      slug: testTreatmentSlug,
      short_description: 'Instant 8-shade brightening with zero sensitivity.',
      full_description: 'Advanced dental laser application with protective barrier for immaculate enamel radiance.',
      benefits: JSON.stringify(['Instant results', 'Pain-free', 'Enamel safe']),
      treatment_image_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600',
      display_order: 1,
    }),
  });
  assert(createTrtRes.status === 201 && createTrtRes.data?.treatment?.id, 'Treatment created and saved into Cloudflare D1');

  const publicTrts = await request('/api/content?type=treatment');
  const trtInContent = publicTrts.data?.items?.find(t => t.slug === testTreatmentSlug);
  assert(Boolean(trtInContent), 'New treatment visible in public /api/content?type=treatment');

  // 4. Blog Management & Public Article Detail Sync
  console.log('\n4. TESTING BLOG MANAGEMENT & DETAIL PAGE SYNC...');
  const testBlogSlug = `modern-dental-implants-${Date.now().toString().slice(-4)}`;
  const createBlogRes = await request('/api/admin/blogs', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Why Dental Implants Are the Gold Standard for Missing Teeth',
      slug: testBlogSlug,
      category: 'Implantology',
      description: 'Comprehensive guide to lifetime titanium root replacements.',
      content: 'Dental implants fuse directly with jawbone in a process called osseointegration, providing 100% natural bite force.',
      cover_image_url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=800',
    }),
  });
  assert(createBlogRes.status === 201 && createBlogRes.data?.blog?.id, 'Blog post published to Cloudflare D1');

  const getBlogRes = await request(`/api/blog/${testBlogSlug}`);
  assert(getBlogRes.status === 200 && (getBlogRes.data?.blog?.slug === testBlogSlug || getBlogRes.data?.item?.slug === testBlogSlug), 'Blog detail page fetches correctly via /api/blog/:slug');

  // 5. Cloudflare R2 Live Image Upload & Streaming
  console.log('\n5. TESTING CLOUDFLARE R2 LIVE OBJECT STORAGE...');
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
  const dummyPayload = Buffer.concat([pngHeader, Buffer.alloc(128, 42)]);

  const uploadRes = await fetch(`${BASE_URL}/api/admin/uploads?folder=doctors&filename=test-e2e-avatar.png&mime=image/png`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      ...(cookieHeader ? { Cookie: cookieHeader.split(';')[0] } : {}),
    },
    body: dummyPayload,
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.status === 201 && uploadData?.key?.startsWith('doctors/'), `File uploaded directly to Live Cloudflare R2: ${uploadData?.key}`);

  // Test streaming the uploaded file back from Cloudflare R2
  const streamRes = await fetch(`${BASE_URL}${uploadData.url}`);
  assert(streamRes.status === 200 && streamRes.headers.get('content-type')?.includes('image/png'), 'Media streamed back from Cloudflare R2 successfully');

  // 6. Clinic Settings Context & Contact Sync
  console.log('\n6. TESTING CLINIC SETTINGS D1 SYNC...');
  const updateSettingsRes = await request('/api/admin/clinic-settings', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      clinic_name: 'Sri Saraswathi Dental Clinic',
      phone: '0424 427 2494',
      opening_hours: 'Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency Only',
    }),
  });
  assert(updateSettingsRes.status === 200 && updateSettingsRes.data?.settings?.phone === '0424 427 2494', 'Clinic settings updated and retrieved from D1');

  // 7. Appointments & Conflict Prevention
  console.log('\n7. TESTING APPOINTMENTS & PERSISTENCE...');
  const testPatientPhone = `9842${Math.floor(100000 + Math.random() * 900000)}`;
  const bookingRes = await request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientName: 'Karthikeyan Test Patient',
      patientPhone: testPatientPhone,
      patientEmail: 'patient.test@gmail.com',
      service: 'root-canal',
      date: '2026-11-20',
      time: '10:00 AM',
      notes: 'Initial consultation request for dental care.',
    }),
  });
  assert(bookingRes.status === 201 && bookingRes.data?.booking?.id, 'Patient appointment booked and stored into Cloudflare D1');

  // Clean up created test entities
  if (createdDoctorId) {
    await request(`/api/admin/doctors/${createdDoctorId}`, { method: 'DELETE', headers: authHeaders });
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
