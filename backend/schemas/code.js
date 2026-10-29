import { z } from 'zod';

export const executeCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000),
  questionId: z.string().min(1, 'Question ID is required'),
  contentRevision: z.string().regex(/^[a-f0-9]{10}$/).optional(),
});

export const gradeCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000),
  submissionId: z.string().uuid().optional(),
  timeTaken: z.number().finite().min(0).max(86400).optional(),
  contentRevision: z.string().regex(/^[a-f0-9]{10}$/).optional(),
});

export const submitCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000),
  questionId: z.string().min(1, 'Question ID is required'),
  language: z.string().min(1, 'Language is required'),
  testCases: z.array(z.any()).optional(),
});

const testCaseSchema = z.object({
  inputs: z.array(z.any()).min(1, 'Test case must have at least one input'),
  expectedOutput: z.any().refine(val => val !== undefined && val !== null && val !== '', {
    message: 'Test case must have an expected output',
  }),
});

export const updateTestCasesSchema = z.object({
  exampleTestCases: z.array(testCaseSchema).optional(),
  testCases: z.array(testCaseSchema).optional(),
}).refine(data => data.exampleTestCases || data.testCases, {
  message: 'Either exampleTestCases or testCases must be provided',
});

export const updateTemplatesSchema = z.object({
  templates: z.object({
    python: z.string().optional(),
    javascript: z.string().optional(),
  }).refine(t => t.python || t.javascript, {
    message: 'At least one template language must be provided',
  }),
});

export const updateQuestionSchema = z.object({
  name: z.string().optional(),
  link: z.string().optional(),
  group: z.string().optional(),
  difficulty: z.string().optional(),
  description: z.string().optional(),
  list: z.string().optional(),
  order: z.number().optional(),
  exampleTestCases: z.array(testCaseSchema).optional(),
  testCases: z.array(testCaseSchema).optional(),
  templates: z.object({
    python: z.string().optional(),
    javascript: z.string().optional(),
  }).optional(),
  types: z.array(z.string()).optional(),
}).strict();

export const submitMcqSchema = z.object({
  selectedOptionId: z.string().min(1, 'Option ID is required'),
  submissionId: z.string().uuid().optional(),
  timeTaken: z.number().finite().min(0).max(86400).optional(),
  contentRevision: z.string().regex(/^[a-f0-9]{10}$/).optional(),
});

export const trackRecommendationSchema = z.object({
  questionId: z.string().min(1),
  action: z.enum(['attempted', 'skipped']),
  clickedAt: z.string().datetime().optional(),
});

export const solveHistorySchema = z.object({
  userId: z.string().min(1),
  questionId: z.string().min(1),
  note: z.string().max(10000).optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string().max(100)).max(30).optional(),
}).strict();
