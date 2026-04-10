import type { Challenge } from "@/types/app";

export const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: "Common Ground Connect",
    day: "Day 1",
    points: 1,
    description:
      "Screenshot showing at least 3 things you have in common with a new person you met.",
    requiresUpload: true,
  },
  {
    id: 2,
    title: "Creative Tribe Bomb Challenge",
    day: "Day 3",
    points: 3,
    description:
      "Screenshot or photo showing your group's creative challenge activity.",
    requiresUpload: true,
  },
  {
    id: 3,
    title: "3-Day Posting Streak",
    day: "Days 1-3",
    points: 2,
    description:
      "Screenshot showing 3 posts across 3 different days on WhatsApp or Instagram.",
    requiresUpload: true,
  },
  {
    id: 4,
    title: "Goal Buddy Connect in DM",
    day: "Any Day",
    points: 3,
    description:
      "Screenshot of a DM conversation discussing life goals with someone.",
    requiresUpload: true,
  },
  {
    id: 5,
    title: "My First Professional Post",
    day: "Day 2/3",
    points: 1,
    description:
      "Screenshot of your LinkedIn post about personal development or professional growth.",
    requiresUpload: true,
  },
  {
    id: 6,
    title: "Tribe Mate Hunt",
    day: "Day 3",
    points: 3,
    description:
      "Screenshot or note showing you found someone with an admirable quality.",
    requiresUpload: true,
  },
  {
    id: 7,
    title: "Growth Mindset Moment",
    day: "Any Day",
    points: 2,
    description:
      "Screenshot of a reflection, note, or post about a growth mindset learning.",
    requiresUpload: true,
  },
  {
    id: 8,
    title: "Curiosity Connector",
    day: "Days 1-3",
    points: 5,
    description:
      "Invite friends using your referral link. Points awarded by admin after confirmation.",
    requiresUpload: false,
  },
  {
    id: 9,
    title: "Tribe Snap Challenge",
    day: "Day 2",
    points: 1,
    description:
      "Creative group photo or video screenshot with your tribe members.",
    requiresUpload: true,
  },
];
