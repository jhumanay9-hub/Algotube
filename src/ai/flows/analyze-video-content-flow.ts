
'use server';
/**
 * @fileOverview A video analysis flow that generates SEO tags, summaries, and performs safety checks.
 *
 * - analyzeVideoContent - Analyzes video metadata for optimization and safety.
 * - AnalyzeVideoInput - The input type for the analysis function.
 * - AnalyzeVideoOutput - The return type for the analysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVideoInputSchema = z.object({
  title: z.string().describe('The user-provided title of the video.'),
  description: z.string().describe('The user-provided description of the video.'),
});
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;

const AnalyzeVideoOutputSchema = z.object({
  seoTags: z.array(z.string()).length(10).describe('10 optimized SEO tags for the video.'),
  summary: z.string().describe('A concise 2-sentence summary of the video content.'),
  isSafe: z.boolean().describe('Whether the content adheres to community guidelines.'),
  safetyReason: z.string().optional().describe('Reason for flagging content, if unsafe.'),
});
export type AnalyzeVideoOutput = z.infer<typeof AnalyzeVideoOutputSchema>;

export async function analyzeVideoContent(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
  return analyzeVideoContentFlow(input);
}

const analyzePrompt = ai.definePrompt({
  name: 'analyzeVideoContentPrompt',
  input: {schema: AnalyzeVideoInputSchema},
  output: {schema: AnalyzeVideoOutputSchema},
  prompt: `You are an expert AI content analyst for AlgoTube.
Your task is to process the following video metadata and provide optimization and safety insights.

### Video Metadata ###
Title: {{{title}}}
Description: {{{description}}}

### Instructions ###
1. Generate exactly 10 high-performance SEO tags that will help this video reach the right audience.
2. Write a compelling, professional 2-sentence summary of the video.
3. Perform a safety audit. Flag content (isSafe: false) if it contains explicit violence, hate speech, or severe harassment.
4. If the content is flagged, provide a brief internal reason for the flag.

Adhere strictly to the requested output format.
`,
});

const analyzeVideoContentFlow = ai.defineFlow(
  {
    name: 'analyzeVideoContentFlow',
    inputSchema: AnalyzeVideoInputSchema,
    outputSchema: AnalyzeVideoOutputSchema,
  },
  async (input) => {
    const {output} = await analyzePrompt(input);
    return output!;
  }
);
