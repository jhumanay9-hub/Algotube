
import { VideoMetadata } from "@/lib/sorting";
import { PlaceHolderImages } from "@/lib/placeholder-images";

// Using a fixed timestamp to avoid hydration mismatches with relative time calculations
const MOCK_NOW = 1740480000000; 

export const MOCK_VIDEOS: VideoMetadata[] = [
  {
    id: "v1",
    title: "Exploring the Neon Streets of Tokyo",
    views: 1250000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 24 * 2,
    tags: ["travel", "vlog", "lifestyle"],
    thumbnail: PlaceHolderImages[0]?.imageUrl || "https://picsum.photos/seed/travel1/600/400",
    creator: "Wanderlust_Vibes",
    category: "Social Life"
  },
  {
    id: "v2",
    title: "Top 10 Coding Secrets Every Dev Should Know",
    views: 450000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 5,
    tags: ["programming", "tech", "productivity"],
    thumbnail: PlaceHolderImages[1]?.imageUrl || "https://picsum.photos/seed/dev2/600/400",
    creator: "TheCodeMaster",
    category: "Computer Science"
  },
  {
    id: "v3",
    title: "Cyberpunk Makeup Tutorial: High Fidelity Looks",
    views: 2800000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 12,
    tags: ["fashion", "beauty", "cosplay"],
    thumbnail: PlaceHolderImages[2]?.imageUrl || "https://picsum.photos/seed/fashion3/600/400",
    creator: "NeonBeauty",
    category: "Social Life"
  },
  {
    id: "v4",
    title: "Understanding Black Holes: A Cosmic Journey",
    views: 89000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 48,
    tags: ["science", "space", "physics"],
    thumbnail: PlaceHolderImages[3]?.imageUrl || "https://picsum.photos/seed/space4/600/400",
    creator: "CosmoExplorer",
    category: "Physics"
  },
  {
    id: "v5",
    title: "The Ultimate Guide to Cybersecurity in 2025",
    views: 3400000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 1,
    tags: ["security", "tech", "internet"],
    thumbnail: PlaceHolderImages[4]?.imageUrl || "https://picsum.photos/seed/secure5/600/400",
    creator: "PrivacyShield",
    category: "Cybersecurity"
  }
];

export const MOCK_USER = {
  id: "user_001",
  name: "CreatorAlpha",
  avatar: PlaceHolderImages[5]?.imageUrl || "https://picsum.photos/seed/user1/100/100",
  interests: ["travel", "coding", "lifestyle"]
};
