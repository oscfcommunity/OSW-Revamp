export interface ProfileDescriptionInput {
  name: string;
  bio: string | null;
  canSee: boolean;
}

/**
 * The page description for a profile. The meta tag is emitted whatever the
 * viewer is allowed to see, so a bio the page is hiding must never reach it.
 */
export const profileDescription = ({ name, bio, canSee }: ProfileDescriptionInput): string => {
  const generic = `${name} is a member of the Open Source Weekend community.`;
  return canSee && bio ? bio : generic;
};
