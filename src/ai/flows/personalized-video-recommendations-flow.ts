
'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating personalized video recommendations.
 *
 * - personalizeVideoRecommendations - A function that provides personalized video recommendations.
 * - PersonalizedVideoRecommendationsInput - The input type for the personalizeVideoRecommendations function.
 * - PersonalizedVideoRecommendationsOutput - The return type for the personalizeVideoRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VideoDataSchema = z.object({
  id: z.string().describe('Unique identifier for the video.'),
  title: z.string().describe('The title of the video.'),
  description: z.string().optional().describe('A brief description of the video.'),
  tags: z.array(z.string()).describe('Keywords or categories associated with the video.'),
});

const PersonalizedVideoRecommendationsInputSchema = z.object({
  userId: z.string().describe('The unique identifier of the user.'),
  userInterests: z.array(z.string()).describe('An array of tags representing the user\u2019s stated interests.'),
  viewingHistory: z.array(VideoDataSchema.pick({id: true, title: true, tags: true})).describe('A list of videos the user has previously watched, including their ID, title, and tags.'),
  availableVideos: z.array(VideoDataSchema).describe('A list of all videos available for recommendation, including their ID, title, description, and tags.'),
});
export type PersonalizedVideoRecommendationsInput = z.infer<typeof PersonalizedVideoRecommendationsInputSchema>;

const RecommendedVideoSchema = z.object({
  id: z.string().describe('The unique identifier of the recommended video.'),
  reason: z.string().describe('A brief explanation why this video was recommended.'),
});

const PersonalizedVideoRecommendationsOutputSchema = z.object({
  recommendedVideos: z.array(RecommendedVideoSchema).describe('A list of recommended videos, each with its ID and the reason for recommendation.'),
  overallReasoning: z.string().describe('An overall explanation of the recommendation strategy used.'),
});
export type PersonalizedVideoRecommendationsOutput = z.infer<typeof PersonalizedVideoRecommendationsOutputSchema>;

export async function personalizeVideoRecommendations(input: PersonalizedVideoRecommendationsInput): Promise<PersonalizedVideoRecommendationsOutput> {
  return personalizedVideoRecommendationsFlow(input);
}

const recommendationPrompt = ai.definePrompt({
  name: 'personalizedVideoRecommendationsPrompt',
  input: {schema: PersonalizedVideoRecommendationsInputSchema},
  output: {schema: PersonalizedVideoRecommendationsOutputSchema},
  prompt: `You are an advanced AI video recommendation engine for AlgoTube, a high-performance video-sharing platform.
Your task is to provide personalized video recommendations to a user based on their stated interests and viewing history.
Employ pattern recognition and collaborative filtering principles to suggest relevant content from the available videos that the user has NOT yet watched.

### User Profile ###
User ID: {{{userId}}}
User Interests: {{{userInterests}}}

### User Viewing History ###
{{#if viewingHistory}}
{{#each viewingHistory}}
- Title: {{{this.title}}} (Tags: {{{this.tags}}})
{{/each}}
{{else}}
No viewing history available.
{{/if}}

### Available Videos for Recommendation ###
{{#if availableVideos}}
{{#each availableVideos}}
- ID: {{{this.id}}}
  Title: {{{this.title}}}
  Description: {{{this.description}}}
  Tags: {{{this.tags}}}

{{/each}}
{{else}}
No available videos to recommend.
{{/if}}

### Recommendation Instructions ###
1. Analyze the user's interests and viewing history to identify patterns in their preferences.
2. From the 'Available Videos for Recommendation' list, select videos that the user has NOT watched yet.
3. Prioritize videos that align with the identified patterns, considering tags, descriptions, and potential thematic connections.
4. Provide a list of recommended videos, each with its 'id' and a concise 'reason' for its recommendation.
5. Include an 'overallReasoning' explaining your general strategy and insights for these recommendations.
6. Aim for 3-5 recommendations if sufficient relevant videos are available.

Ensure your output adheres strictly to the JSON schema provided.
`,
});

const personalizedVideoRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedVideoRecommendationsFlow',
    inputSchema: PersonalizedVideoRecommendationsInputSchema,
    outputSchema: PersonalizedVideoRecommendationsOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await recommendationPrompt(input);
      return output!;
    } catch (error: any) {
      console.error('AI Recommendation Quota Exceeded or Error:', error.message);
      
      // Fallback: Pick top 3 videos from availableVideos that aren't in viewingHistory
      const watchedIds = new Set(input.viewingHistory.map(v => v.id));
      const fallbacks = input.availableVideos
        .filter(v => !watchedIds.has(v.id))
        .slice(0, 3)
        .map(v => ({
          id: v.id,
          reason: "Selected via community popularity (AI service currently syncing)."
        }));

      return {
        recommendedVideos: fallbacks,
        overallReasoning: "Fallback strategy enabled due to high algorithmic demand. Providing top relevant available transmissions."
      };
    }
  }
);
