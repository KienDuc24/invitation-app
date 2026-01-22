/**
 * Generate DiceBear avatar URL
 * @param avatarUrl - Existing avatar URL (if available)
 * @param name - Name to use as seed for avatar generation
 * @returns Avatar URL
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined, name: string): string => {
  if (avatarUrl) return avatarUrl;
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=d4af37,111111`;
};
