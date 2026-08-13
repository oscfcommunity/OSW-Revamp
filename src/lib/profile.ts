const MAX_SKILLS = 20;

/**
 * Skills are typed as a comma separated list. Duplicates are folded
 * case-insensitively but the first spelling is kept, so "Rust" survives rather
 * than being lowercased into something the member did not write.
 */
export const parseSkills = (input: string | undefined): string[] => {
  if (!input?.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const skills: string[] = [];

  for (const raw of input.split(',')) {
    const skill = raw.trim();
    if (!skill) continue;

    const key = skill.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    skills.push(skill);
    if (skills.length === MAX_SKILLS) break;
  }

  return skills;
};

const WEB_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Normalises a link a member typed into their profile. People write
 * "github.com/name" far more often than a full URL, so a bare domain is assumed
 * to be https. Anything that is not a web URL — `javascript:` above all — is
 * rejected rather than rendered as a link.
 */
export const profileUrl = (input: string | undefined): string | null => {
  const value = input?.trim();
  if (!value) {
    return null;
  }

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (!WEB_PROTOCOLS.has(url.protocol) || !url.hostname.includes('.')) {
      return null;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};
