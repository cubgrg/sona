import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import wageRules from '../data/california_minimum_wages.json';

export const payrollChatRouter = Router();
payrollChatRouter.use(authenticate);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function formatWageRules(): string {
  return (wageRules as { local: string; description: string; rates: { minimum_wage: string; effective_date: string }[] }[])
    .filter((r) => r.rates.length > 0)
    .map((r) => {
      const latestRate = r.rates[r.rates.length - 1];
      const wage = latestRate?.minimum_wage ?? 'N/A';
      return `- ${r.local} (${r.description}): ${wage} (as of ${latestRate?.effective_date})`;
    })
    .join('\n');
}

payrollChatRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { messages } = req.body as { messages: { role: string; content: string }[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      role: true,
      hourlyRate: true,
      location: { select: { name: true } },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const payPeriod = await prisma.payPeriod.findFirst({
    where: { employeeId: userId, status: 'pending' },
    orderBy: { payDate: 'asc' },
  });

  const grossPay = payPeriod ? payPeriod.grossPay.toFixed(2) : 'N/A';
  const netPay = payPeriod ? payPeriod.netPay.toFixed(2) : 'N/A';
  const deductions = payPeriod ? (payPeriod.grossPay - payPeriod.netPay).toFixed(2) : 'N/A';
  const hoursWorked = payPeriod?.hoursWorked ?? 'N/A';
  const hourlyRate = user.hourlyRate ?? 'N/A';
  const payDate = payPeriod
    ? new Date(payPeriod.payDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';
  const periodStart = payPeriod ? new Date(payPeriod.startDate).toLocaleDateString() : 'N/A';
  const periodEnd = payPeriod ? new Date(payPeriod.endDate).toLocaleDateString() : 'N/A';

  const systemPrompt = `You are Sona Payroll Assistant, a friendly and helpful payroll specialist for The Golden Fork restaurant chain.

## Employee: ${user.displayName}
- Role: ${user.role.replace(/_/g, ' ')} at ${user.location?.name ?? 'Unknown Location'}
- Hourly rate: $${hourlyRate}/hr

## Current Pay Period (${periodStart} – ${periodEnd})
- Hours worked: ${hoursWorked}
- Gross pay: $${grossPay}  (${hoursWorked} hours × $${hourlyRate}/hr)
- Estimated tax & deductions: $${deductions}  (≈22% withholding)
- Net take-home pay: $${netPay}
- Pay date: ${payDate}

## How Deductions Work
22% estimated withholding covers:
- Federal income tax (approx. 12–15% depending on filing status)
- California state income tax (approx. 5–7%)
Actual amounts depend on W-4 elections and filing status.

## California Minimum Wage Rules (current rates)
${formatWageRules()}

## Guidelines
- Be friendly and specific to THIS employee's actual pay data above
- Explain calculations clearly (e.g. "$576 gross = 32 hours × $18/hr")
- Be honest that 22% is an estimate; actual tax varies
- Keep responses concise — 2–5 sentences is usually enough
- NEVER suggest contacting HR, a manager, or any other person — answer the question yourself
- Use plain text only — no markdown, no asterisks, no bold, no bullet points in responses`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply = textBlock?.type === 'text' ? textBlock.text : 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (err) {
    console.error('Payroll chat error:', err);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});
