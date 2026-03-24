# **App Name**: AlgoTube

## Core Features:

- User Authentication & Profiles: Enable secure user sign-up, login, and basic profile management utilizing Firestore's user collection for data storage.
- Video Upload & Processing: Allow users to upload video files (.mp4, .mp3) to Firebase Storage. Cloud Functions will extract metadata and store it in the Firestore 'videos' collection, alongside updating the search index.
- HTML5 Canvas Video Player: Implement a high-performance video player using the HTML5 Canvas API to support custom overlays, smooth transitions, and core playback functionalities.
- Real-time Search with Type-ahead: Provide instant, dynamic search suggestions as users type, powered by a Trie (Prefix Tree) data structure for efficient video discovery.
- Trending Videos Feed: Display a curated feed of trending videos, sorted using a Heapsort or Quicksort algorithm based on view-count weight and time-decay logic.
- AI-Powered Video Recommendations: Generate personalized video suggestions to users based on their tracked 'Interests' and collaborative filtering using a pattern recognition algorithm. This generative AI tool leverages user and analytics patterns from Firestore to provide relevant content.

## Style Guidelines:

- Color Scheme: Dark. This choice is inspired by the requested 'Cybersecurity Dark' theme, emphasizing depth and focus.
- Primary color: A deep, authoritative blue (#294F99) to establish a sense of technical sophistication and trustworthiness, suitable for interactive elements and highlights.
- Background color: A very dark, almost black blue-grey (#181B1F), providing a minimalist canvas that allows glassmorphic elements to truly pop.
- Accent color: A vibrant neon cyan (#74DEEC) for crucial calls-to-action, active states, and to provide a stark, high-tech contrast against the dark background.
- Headline font: 'Space Grotesk' (sans-serif) for its computerized and techy aesthetic, reinforcing the platform's high-performance nature. Body font: 'Inter' (sans-serif) for clean readability in longer descriptions and comments.
- Utilize minimalist, geometric line-art icons that complement the glassmorphism aesthetic and evoke a clean, modern, and high-tech feel. Employ subtle glowing or transparency effects where appropriate.
- Employ a Glassmorphism design system throughout, featuring frosted glass effects, transparency, and vivid background blurs. The 'Recommended' sidebar is positioned on the left, with 'Community/Comments' housed within a glass-morphic floating panel on the right.
- Integrate smooth and subtle micro-interactions for UI elements, transitions between sections, and especially within the HTML5 Canvas video player for custom overlay fades and content shifts, enhancing the premium feel without being distracting.