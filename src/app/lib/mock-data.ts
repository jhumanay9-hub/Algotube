import { VideoMetadata } from "@/lib/sorting";
import { PlaceHolderImages } from "@/lib/placeholder-images";

// Using a fixed timestamp to avoid hydration mismatches with relative time calculations
const MOCK_NOW = 1740480000000; 

export const MOCK_VIDEOS: VideoMetadata[] = [
  {
    id: "v1",
    title: "Quantum Encryption: The Future of Privacy",
    views: 1250000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 24 * 2,
    tags: ["cybersecurity", "quantum", "privacy"],
    thumbnail: PlaceHolderImages[0]?.imageUrl || "https://picsum.photos/seed/tech1/600/400",
    creator: "EthicalDev"
  },
  {
    id: "v2",
    title: "Zero Trust Architecture Explained",
    views: 450000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 5,
    tags: ["networking", "security", "enterprise"],
    thumbnail: PlaceHolderImages[1]?.imageUrl || "https://picsum.photos/seed/code2/600/400",
    creator: "CloudGuardians"
  },
  {
    id: "v3",
    title: "Hacking the Matrix: A Live Coding Session",
    views: 2800000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 12,
    tags: ["coding", "hacking", "live"],
    thumbnail: PlaceHolderImages[2]?.imageUrl || "https://picsum.photos/seed/hack3/600/400",
    creator: "NeoCodex"
  },
  {
    id: "v4",
    title: "Social Engineering 101: Human Firewalls",
    views: 89000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 48,
    tags: ["psychology", "security", "social-engineering"],
    thumbnail: PlaceHolderImages[3]?.imageUrl || "https://picsum.photos/seed/secure4/600/400",
    creator: "HackerMind"
  },
  {
    id: "v5",
    title: "Cyberpunk 2077 vs Reality: Tech Analysis",
    views: 3400000,
    uploadedAt: MOCK_NOW - 1000 * 60 * 60 * 1,
    tags: ["tech", "gaming", "future"],
    thumbnail: PlaceHolderImages[4]?.imageUrl || "https://picsum.photos/seed/city5/600/400",
    creator: "FutureSight"
  }
];

export const MOCK_USER = {
  id: "user_001",
  name: "GhostRunner",
  avatar: PlaceHolderImages[5]?.imageUrl || "https://picsum.photos/seed/user1/100/100",
  interests: ["cybersecurity", "coding", "privacy"]
};
