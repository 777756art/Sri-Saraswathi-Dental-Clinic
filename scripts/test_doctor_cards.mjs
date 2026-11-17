// scripts/test_doctor_cards.mjs
// Verification suite for Doctor Placeholder Removal & Dynamic Grid Adjustment
// Sri Saraswathi Dental Clinic

function isValidDoctor(doc) {
  if (!doc) return false;
  const name = String(doc.title || doc.name || "").trim();
  const media = String(doc.mediaUrl || doc.profileImageUrl || doc.profile_image_url || "").trim();
  if (!name || name.length < 3) return false;
  if (/test\s*\d+/i.test(name) || /dummy/i.test(name) || /sample/i.test(name)) return false;
  if (!media) return false;
  if (doc.published === false || doc.status === "inactive") return false;
  return true;
}

const getGridClass = (count) => {
  if (count === 1) {
    return "mt-10 mx-auto max-w-sm sm:max-w-md";
  }
  if (count === 2) {
    return "mt-10 mx-auto max-w-3xl grid gap-6 sm:grid-cols-2 justify-center";
  }
  if (count === 3) {
    return "mt-10 mx-auto max-w-5xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-center";
  }
  return "mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
};

async function run() {
  console.log("====================================================");
  console.log("DOCTOR PLACEHOLDER REMOVAL & GRID ADJUSTMENT TEST");
  console.log("====================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      fails++;
    }
  }

  // 1. Validation Logic
  console.log("--- 1. PLACEHOLDER & DUMMY DOCTOR FILTERING ---");
  const dummyDocWithoutImage = { id: 2, title: "Dr. Ananya Raman", mediaUrl: "", published: true };
  assert(isValidDoctor(dummyDocWithoutImage) === false, "Filters out doctor with empty profile image");

  const dummyDocWithWhitespaceImage = { id: 3, title: "Dr. Ananya Raman", mediaUrl: "   ", published: true };
  assert(isValidDoctor(dummyDocWithWhitespaceImage) === false, "Filters out doctor with whitespace-only image URL");

  const dummyTestDoc = { id: 7, title: "Dr. Rajesh Test 0643", mediaUrl: "https://example.com/photo.jpg", published: true };
  assert(isValidDoctor(dummyTestDoc) === false, "Filters out dummy test doctor with 'Test 0643' in title");

  const validDoctor = {
    id: 1,
    title: "Dr. Kishore Kumar",
    specialization: "Chief Dental Surgeon",
    mediaUrl: "/api/media/doctors/images-1794368547791-e800ada5.jpg",
    published: true,
  };
  assert(isValidDoctor(validDoctor) === true, "Validates genuine doctor with title and uploaded photograph");

  // 2. Dynamic Grid Adjustment
  console.log("\n--- 2. DYNAMIC GRID ADJUSTMENT ---");
  assert(getGridClass(1).includes("max-w-sm sm:max-w-md") && getGridClass(1).includes("mx-auto"), "1 Doctor: Centered card container");
  assert(getGridClass(2).includes("grid") && getGridClass(2).includes("sm:grid-cols-2") && getGridClass(2).includes("max-w-3xl"), "2 Doctors: Balanced 2-card container");
  assert(getGridClass(3).includes("grid") && getGridClass(3).includes("lg:grid-cols-3") && getGridClass(3).includes("max-w-5xl"), "3 Doctors: Balanced 3-card container");
  assert(getGridClass(4).includes("xl:grid-cols-4"), "4+ Doctors: Responsive multi-column grid");

  console.log("\n====================================================");
  console.log(`TEST SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log("====================================================");

  if (fails > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
