export interface PlatformMatch {
  platform: string;
  category: string;
  logoKey: string;
}

const PLATFORM_RULES: Array<{
  test: RegExp;
  platform: string;
  category: string;
  logoKey: string;
}> = [
  {
    test: /github\.com/i,
    platform: "GitHub",
    category: "Developer",
    logoKey: "github",
  },
  {
    test: /gitlab\.com/i,
    platform: "GitLab",
    category: "Developer",
    logoKey: "gitlab",
  },
  {
    test: /bitbucket\.org/i,
    platform: "Bitbucket",
    category: "Developer",
    logoKey: "bitbucket",
  },
  {
    test: /stackoverflow\.com/i,
    platform: "Stack Overflow",
    category: "Developer",
    logoKey: "stackoverflow",
  },
  {
    test: /steamcommunity\.com|steampowered\.com/i,
    platform: "Steam",
    category: "Gaming",
    logoKey: "steam",
  },
  {
    test: /epicgames\.com|fortnite\.com/i,
    platform: "Epic Games",
    category: "Gaming",
    logoKey: "epic",
  },
  {
    test: /nexusmods\.com/i,
    platform: "NexusMods",
    category: "Gaming",
    logoKey: "nexusmods",
  },
  {
    test: /reddit\.com/i,
    platform: "Reddit",
    category: "Communities",
    logoKey: "reddit",
  },
  {
    test: /(^|\.)x\.com|twitter\.com/i,
    platform: "X",
    category: "Social",
    logoKey: "x",
  },
  {
    test: /facebook\.com|fb\.com/i,
    platform: "Facebook",
    category: "Social",
    logoKey: "facebook",
  },
  {
    test: /instagram\.com/i,
    platform: "Instagram",
    category: "Social",
    logoKey: "instagram",
  },
  {
    test: /tiktok\.com/i,
    platform: "TikTok",
    category: "Social",
    logoKey: "tiktok",
  },
  {
    test: /youtube\.com|youtu\.be/i,
    platform: "YouTube",
    category: "Social",
    logoKey: "youtube",
  },
  {
    test: /linkedin\.com/i,
    platform: "LinkedIn",
    category: "Social",
    logoKey: "linkedin",
  },
  { test: /xing\.com/i, platform: "XING", category: "Social", logoKey: "xing" },
  {
    test: /computerbase\.de/i,
    platform: "ComputerBase",
    category: "Foren",
    logoKey: "computerbase",
  },
  {
    test: /android-hilfe\.de/i,
    platform: "Android-Hilfe",
    category: "Foren",
    logoKey: "androidhilfe",
  },
  {
    test: /e60-forum|e60forum/i,
    platform: "e60 Forum",
    category: "Foren",
    logoKey: "e60",
  },
  {
    test: /flightplandatabase\.com/i,
    platform: "FlightPlan Database",
    category: "Communities",
    logoKey: "flightplan",
  },
  {
    test: /discord\.com|discord\.gg/i,
    platform: "Discord",
    category: "Communities",
    logoKey: "discord",
  },
  {
    test: /t\.me|telegram\.(org|me)/i,
    platform: "Telegram",
    category: "Communities",
    logoKey: "telegram",
  },
  {
    test: /medium\.com|blogspot\.|wordpress\./i,
    platform: "Blogs",
    category: "Blogs",
    logoKey: "blogs",
  },
  {
    test: /wikipedia\.org|fandom\.com|wiki/i,
    platform: "Wikis",
    category: "Wikis",
    logoKey: "wikis",
  },
  {
    test: /ebay\.|amazon\.|kleinanzeigen\.|etsy\./i,
    platform: "Marktplätze",
    category: "Shopping",
    logoKey: "market",
  },
  {
    test: /pornhub\.|xvideos\.|onlyfans\.|xhamster\./i,
    platform: "Adult Platforms",
    category: "Dating",
    logoKey: "adult",
  },
  {
    test: /tinder\.|badoo\.|lovoo\.|okcupid\./i,
    platform: "Datingplattformen",
    category: "Dating",
    logoKey: "dating",
  },
  {
    test: /casino|bet365|pokerstar|glücksspiel/i,
    platform: "Glücksspiel",
    category: "Gambling",
    logoKey: "gambling",
  },
  {
    test: /\.onion|darkweb|darknet/i,
    platform: "Darknet",
    category: "Darknet",
    logoKey: "darknet",
  },
];

const CATEGORY_HINTS: Array<{
  test: RegExp;
  category: string;
  platform: string;
}> = [
  { test: /forum|board|community/i, category: "Foren", platform: "Foren" },
  {
    test: /github|gitlab|bitbucket|stackoverflow|open.?source/i,
    category: "Open Source",
    platform: "Open Source",
  },
  {
    test: /steam|epic|gaming|xbox|playstation|twitch/i,
    category: "Gaming",
    platform: "Gaming",
  },
  {
    test: /shop|markt|buy|sell|kleinanzeigen/i,
    category: "Shopping",
    platform: "Shopping",
  },
];

function titleCaseHost(host: string): string {
  const base = host.replace(/^www\./i, "").split(".")[0] || host;
  if (!base) return "Sonstige";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function detectPlatform(
  url: string,
  title = "",
  snippet = ""
): PlatformMatch {
  const haystack = `${url}\n${title}\n${snippet}`;
  for (const rule of PLATFORM_RULES) {
    if (rule.test.test(haystack) || rule.test.test(url)) {
      return {
        platform: rule.platform,
        category: rule.category,
        logoKey: rule.logoKey,
      };
    }
  }

  for (const hint of CATEGORY_HINTS) {
    if (hint.test.test(haystack)) {
      return {
        platform: hint.platform,
        category: hint.category,
        logoKey: hint.category.toLowerCase().replace(/\s+/g, ""),
      };
    }
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return {
      platform: titleCaseHost(host),
      category: "Sonstige",
      logoKey: "other",
    };
  } catch {
    return { platform: "Sonstige", category: "Sonstige", logoKey: "other" };
  }
}

const PROBLEM_PATTERNS: Array<{ tag: string; test: RegExp }> = [
  { tag: "Pornografie", test: /porn|xxx|onlyfans|adult|nsfw/i },
  { tag: "Glücksspiel", test: /casino|betting|poker|glücksspiel|gambling/i },
  { tag: "Extremismus", test: /extremist|terror|hate.?group/i },
  { tag: "Dating", test: /tinder|badoo|lovoo|dating|singles/i },
  { tag: "gehackte Accounts", test: /hacked|leak|breach|combolist|stealer/i },
  { tag: "Scam", test: /scam|phishing|fraud|fake.?account/i },
  { tag: "auffällige Foren", test: /raid.?forum|cracked\.|nulled|warez/i },
  { tag: "Darknet", test: /\.onion|darknet|dark.?web/i },
];

export function detectProblemTags(
  url: string,
  title: string,
  snippet: string
): string[] {
  const haystack = `${url}\n${title}\n${snippet}`;
  return PROBLEM_PATTERNS.filter((p) => p.test.test(haystack)).map(
    (p) => p.tag
  );
}
