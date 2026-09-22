import Groq from 'groq-sdk';
import dotenv from 'dotenv';

export interface GroqCopilotAnalysis {
  answer: string;
  severity: 'ok' | 'warning' | 'critical';
  evidence: string[];
  recommendations: string[];
}

export const SYSTEM_PROMPT = `You are the Performance Copilot for a Windows device.

You analyze real device telemetry and application usage.

Never invent telemetry values.
If a metric is unavailable, explicitly say it is unavailable.
Do not claim an application is causing a problem unless the provided evidence supports it.
Distinguish measured facts from your interpretation.
Give practical actions the user can actually perform.
Prioritize the most relevant cause instead of listing generic computer tips.

You receive structured device telemetry and application information from the monitoring system.
Respond ONLY with a valid JSON object matching this schema:
{
  "answer": "Clear natural language explanation explaining what is happening and why based on telemetry.",
  "severity": "normal | warning | critical",
  "evidence": [
    "Fact 1 derived directly from telemetry data",
    "Fact 2 derived directly from telemetry data"
  ],
  "recommendations": [
    "Actionable step 1",
    "Actionable step 2"
  ]
}`;

function resolveGroqModel(): string {
  dotenv.config({ override: true });
  const envModel = process.env.GROQ_MODEL?.trim();
  if (envModel) {
    return envModel;
  }
  return 'openai/gpt-oss-20b';
}

export const groqService = {
  isConfigured(): boolean {
    dotenv.config({ override: true });
    const key = process.env.GROQ_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  },

  async testDirectConnection(): Promise<{ success: boolean; response?: string; error?: string }> {
    dotenv.config({ override: true });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Groq API key is not configured.' };
    }

    const modelName = resolveGroqModel();

    try {
      const groq = new Groq({ apiKey: apiKey.trim() });
      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: 'Reply with exactly: GROQ_OK' }],
        max_tokens: 100,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || '';
      if (reply.includes('GROQ_OK') || reply.length > 0) {
        return { success: true, response: 'GROQ_OK' };
      }
      return { success: false, error: 'Unexpected response format from Groq API.' };
    } catch (err: any) {
      const errorMsg = err?.message || 'Groq connection error';
      console.error('[Copilot] Groq test error:', errorMsg);

      if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('api key')) {
        return { success: false, error: 'Groq authentication failed' };
      } else if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('model')) {
        return { success: false, error: 'Groq model unavailable' };
      } else if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        return { success: false, error: 'Groq rate limit exceeded' };
      }
      return { success: false, error: errorMsg };
    }
  },

  async analyzeDeviceTelemetry(
    question: string,
    telemetryContext: Record<string, any>
  ): Promise<GroqCopilotAnalysis | null> {
    dotenv.config({ override: true });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return null;
    }

    const modelName = resolveGroqModel();

    try {
      console.log('[Copilot] Calling Groq with model:', modelName);
      const groq = new Groq({ apiKey: apiKey.trim() });

      const userContent = `User Question: "${question}"

Current Structured Device Telemetry Context:
${JSON.stringify(telemetryContext, null, 2)}`;

      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) return null;

      console.log('[Copilot] Groq response received successfully');
      const parsed = JSON.parse(rawContent);

      let severity: 'ok' | 'warning' | 'critical' = 'ok';
      if (parsed.severity === 'critical') {
        severity = 'critical';
      } else if (parsed.severity === 'warning') {
        severity = 'warning';
      } else {
        severity = 'ok';
      }

      return {
        answer: String(parsed.answer || parsed.explanation || 'Performance analysis completed.'),
        severity,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(String)
          : (parsed.recommendation ? [String(parsed.recommendation)] : []),
      };
    } catch (err: any) {
      console.warn('[Copilot] Groq LLM call error, using local fallback:', err?.message || err);
      return null;
    }
  },
};
