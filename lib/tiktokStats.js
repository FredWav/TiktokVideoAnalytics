// Derive secondary metrics / KPIs from raw parsed data
export function deriveStats(parsed) {
  if (!parsed) return {};
  const { stats, videos } = parsed;
  const videoCount = videos?.length || 0;
  return {
    followerToFollowingRatio: ratio(stats?.followerCount, stats?.followingCount),
    avgLikesPerVideo: null, // placeholder if likes per video scraping implemented
    videoCount
  };
}

function ratio(a, b) {
  if (!a || !b || b === 0) return null;
  return +(a / b).toFixed(2);
}