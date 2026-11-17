// scripts/test_theme_unit.mjs
// Unit Test Suite for Theme Colours Engine & Storage Logic

const DEFAULT_THEME_COLORS = {
  primary: "#1F6878",
  secondary: "#E4F0F2",
  accent: "#E95A35",
  background: "#F5F2EB",
  text: "#15191B",
  header: "#FFFFFF",
  footer: "#1F6878",
};

const normalizeHex = (val, fallback) => {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }
  if (/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
    const withHash = `#${trimmed}`;
    if (withHash.length === 4) {
      return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toUpperCase();
    }
    return withHash.toUpperCase();
  }
  return fallback;
};

// Mock D1 Database implementation
class MockD1 {
  constructor() {
    this.storage = new Map();
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...args) {
        this.args = args;
        return this;
      },
      async first(col) {
        if (sql.includes("SELECT value FROM d1_meta WHERE key = 'theme_colors'")) {
          const val = self.storage.get("theme_colors");
          if (!val) return null;
          return col ? val[col] : { value: val };
        }
        return null;
      },
      async run() {
        if (sql.includes("INSERT INTO d1_meta")) {
          self.storage.set("theme_colors", this.args[0]);
        }
        return { success: true };
      },
    };
  }
}

async function run() {
  console.log("====================================================");
  console.log("THEME COLOURS LOGIC & STORAGE - UNIT TEST SUITE");
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

  // 1. HEX Normalization Tests
  console.log("--- 1. HEX NORMALIZATION TESTS ---");
  assert(normalizeHex("#1f6878", "#000") === "#1F6878", "Normalizes lowercase 6-char hex with hash to uppercase");
  assert(normalizeHex("1f6878", "#000") === "#1F6878", "Normalizes 6-char hex without hash to uppercase with hash");
  assert(normalizeHex("#fff", "#000") === "#FFFFFF", "Expands 3-char hex #fff to #FFFFFF");
  assert(normalizeHex("fff", "#000") === "#FFFFFF", "Expands 3-char hex without hash to #FFFFFF");
  assert(normalizeHex("invalid", "#1F6878") === "#1F6878", "Falls back on invalid string");
  assert(normalizeHex(null, "#1F6878") === "#1F6878", "Falls back on null");
  assert(normalizeHex(undefined, "#1F6878") === "#1F6878", "Falls back on undefined");

  // 2. Storage & Default Retrieval Tests
  console.log("\n--- 2. STORAGE & RETRIEVAL TESTS ---");
  const mockD1 = new MockD1();

  const getThemeColors = async () => {
    try {
      const row = await mockD1.prepare("SELECT value FROM d1_meta WHERE key = 'theme_colors'").first();
      if (!row?.value) return { ...DEFAULT_THEME_COLORS };
      const parsed = JSON.parse(row.value);
      return {
        primary: normalizeHex(parsed.primary, DEFAULT_THEME_COLORS.primary),
        secondary: normalizeHex(parsed.secondary, DEFAULT_THEME_COLORS.secondary),
        accent: normalizeHex(parsed.accent, DEFAULT_THEME_COLORS.accent),
        background: normalizeHex(parsed.background, DEFAULT_THEME_COLORS.background),
        text: normalizeHex(parsed.text, DEFAULT_THEME_COLORS.text),
        header: normalizeHex(parsed.header, DEFAULT_THEME_COLORS.header),
        footer: normalizeHex(parsed.footer, DEFAULT_THEME_COLORS.footer),
      };
    } catch {
      return { ...DEFAULT_THEME_COLORS };
    }
  };

  const saveThemeColors = async (patch = {}) => {
    const current = await getThemeColors();
    const next = {
      primary: patch.primary !== undefined ? normalizeHex(patch.primary, current.primary) : current.primary,
      secondary: patch.secondary !== undefined ? normalizeHex(patch.secondary, current.secondary) : current.secondary,
      accent: patch.accent !== undefined ? normalizeHex(patch.accent, current.accent) : current.accent,
      background: patch.background !== undefined ? normalizeHex(patch.background, current.background) : current.background,
      text: patch.text !== undefined ? normalizeHex(patch.text, current.text) : current.text,
      header: patch.header !== undefined ? normalizeHex(patch.header, current.header) : current.header,
      footer: patch.footer !== undefined ? normalizeHex(patch.footer, current.footer) : current.footer,
    };
    await mockD1
      .prepare(
        `INSERT INTO d1_meta (key, value, updated_at)
         VALUES ('theme_colors', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(JSON.stringify(next))
      .run();
    return next;
  };

  const initial = await getThemeColors();
  assert(initial.primary === "#1F6878", "Default Primary is #1F6878");
  assert(initial.secondary === "#E4F0F2", "Default Secondary is #E4F0F2");
  assert(initial.accent === "#E95A35", "Default Accent is #E95A35");
  assert(initial.background === "#F5F2EB", "Default Background is #F5F2EB");
  assert(initial.text === "#15191B", "Default Text is #15191B");
  assert(initial.header === "#FFFFFF", "Default Header is #FFFFFF");
  assert(initial.footer === "#1F6878", "Default Footer is #1F6878");

  // 3. Patching Individual Colors
  console.log("\n--- 3. PATCHING INDIVIDUAL COLOURS ---");
  const updated1 = await saveThemeColors({ primary: "#264653", accent: "fb8500" });
  assert(updated1.primary === "#264653", "Updated Primary saved as #264653");
  assert(updated1.accent === "#FB8500", "Updated Accent normalized to #FB8500");
  assert(updated1.secondary === "#E4F0F2", "Unchanged Secondary remained #E4F0F2");
  assert(updated1.background === "#F5F2EB", "Unchanged Background remained #F5F2EB");

  // Verify persistence on fresh read
  const freshRead = await getThemeColors();
  assert(freshRead.primary === "#264653", "Fresh read from database returns updated Primary");
  assert(freshRead.accent === "#FB8500", "Fresh read from database returns updated Accent");

  // 4. Resetting to Default
  console.log("\n--- 4. RESET TO DEFAULT ---");
  await mockD1
    .prepare("INSERT INTO d1_meta (key, value, updated_at) VALUES ('theme_colors', ?, datetime('now'))")
    .bind(JSON.stringify(DEFAULT_THEME_COLORS))
    .run();
  const resetRead = await getThemeColors();
  assert(resetRead.primary === "#1F6878", "Reset restored Primary to #1F6878");
  assert(resetRead.accent === "#E95A35", "Reset restored Accent to #E95A35");
  assert(resetRead.header === "#FFFFFF", "Reset restored Header to #FFFFFF");
  assert(resetRead.footer === "#1F6878", "Reset restored Footer to #1F6878");

  console.log("\n====================================================");
  console.log(`UNIT TEST SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log("====================================================");

  if (fails > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
