const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const CHUNK_CHARS = Math.min(Number(process.env.ANALYSIS_CHUNK_CHARS) || 12000, 16000);
const MAX_CHUNKS = Math.min(Number(process.env.ANALYSIS_MAX_CHUNKS) || 12, 20);
const CHUNK_OUTPUT_TOKENS = Math.min(Number(process.env.ANALYSIS_CHUNK_OUTPUT_TOKENS) || 900, 1400);
const FINAL_OUTPUT_TOKENS = Math.min(Number(process.env.ANALYSIS_FINAL_OUTPUT_TOKENS) || 1800, 2500);

class AnalysisError extends Error {
  constructor(code, message, status = 500, retryable = false) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const cleanText = (text = '') => text
  .replace(/\u0000/g, '')
  .replace(/\r\n?/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const splitIntoChunks = (input, maxChars = CHUNK_CHARS, maxChunks = MAX_CHUNKS) => {
  const text = cleanText(input);
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  const push = () => { if (current.trim()) chunks.push(current.trim()); current = ''; };

  for (const paragraph of paragraphs) {
    if (chunks.length >= maxChunks) break;
    if (paragraph.length > maxChars) {
      push();
      for (let start = 0; start < paragraph.length && chunks.length < maxChunks; start += maxChars) {
        let end = Math.min(start + maxChars, paragraph.length);
        if (end < paragraph.length) {
          const boundary = paragraph.lastIndexOf(' ', end);
          if (boundary > start + maxChars * 0.7) end = boundary;
        }
        chunks.push(paragraph.slice(start, end).trim());
        start = end - maxChars;
      }
    } else if (!current || current.length + paragraph.length + 2 <= maxChars) {
      current += `${current ? '\n\n' : ''}${paragraph}`;
    } else {
      push();
      current = paragraph;
    }
  }
  if (chunks.length < maxChunks) push();
  return chunks.slice(0, maxChunks);
};

const mapProviderError = (error) => {
  const code = error?.code || error?.error?.code;
  const status = error?.httpStatus || error?.status || error?.error?.status;
  const message = String(error?.message || error?.error?.message || '').toLowerCase();
  if (status === 400 && /token|context|input.*limit/.test(message)) return new AnalysisError('TOKEN_LIMIT', 'Gemini rejected the request because it exceeded the model input limit.', 413);
  if (status === 400 && /api key/.test(message)) return new AnalysisError('INVALID_API_KEY', 'The server Gemini API key is invalid.', 503);
  if (status === 401 || status === 403 || code === 'API_KEY_INVALID') return new AnalysisError('INVALID_API_KEY', 'The server Gemini API key is invalid or not permitted for this project.', 503);
  if (status === 429 || code === 'RESOURCE_EXHAUSTED') return new AnalysisError('RATE_LIMITED', 'The free Gemini daily or rate quota is currently exhausted. Please view a Sample Demo or try again tomorrow.', 429, true);
  if (status >= 500) return new AnalysisError('AI_UNAVAILABLE', 'The AI provider is temporarily unavailable.', 503, true);
  return new AnalysisError('AI_FAILED', 'AI analysis failed. Please retry or use Sample Demo.', 502, Boolean(error?.retryable));
};

const schemaPrompt = `Return JSON only with: summary (string), clauses (array of {type,text,riskLevel,explanation}), risks (array of {severity,category,description,recommendation}), overallRiskScore (0-100), keyFindings (string array), recommendations (string array). Risk/severity must be low, medium, high, or critical.`;

const requestJson = async (prompt, maxTokens) => {
  if (!process.env.GEMINI_API_KEY) throw new AnalysisError('MISSING_API_KEY', 'Live AI analysis is not configured. Use a Sample Demo or add GEMINI_API_KEY on the server.', 503);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You analyze legal documents. Return valid JSON only. Do not provide legal advice.' }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw { ...(payload.error || {}), httpStatus: response.status };
    const content = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
    if (!content) throw new AnalysisError('INVALID_AI_RESPONSE', 'Gemini returned an empty response.', 502, true);
    return { data: JSON.parse(content), tokens: payload.usageMetadata?.totalTokenCount || 0 };
  } catch (error) {
    if (error instanceof SyntaxError) throw new AnalysisError('INVALID_AI_RESPONSE', 'The AI returned an invalid structured response.', 502, true);
    if (error instanceof AnalysisError) throw error;
    throw mapProviderError(error);
  }
};

const analyzeDocument = async (rawText, documentName, onProgress = async () => {}) => {
  if (!process.env.GEMINI_API_KEY) throw new AnalysisError('MISSING_API_KEY', 'Live AI analysis is not configured. Use a Sample Demo or add GEMINI_API_KEY on the server.', 503);
  const chunks = splitIntoChunks(rawText);
  if (!chunks.length) throw new AnalysisError('EMPTY_DOCUMENT', 'No readable text was found in this document.', 422);
  const partials = [];
  let tokensUsed = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    await onProgress(index, chunks.length, 'analyzing');
    const result = await requestJson(`${schemaPrompt}\nAnalyze chunk ${index + 1} of ${chunks.length} from "${documentName}". Focus only on material clauses and risks.\n\n${chunks[index]}`, CHUNK_OUTPUT_TOKENS);
    partials.push(result.data);
    tokensUsed += result.tokens;
  }

  await onProgress(chunks.length, chunks.length, 'combining');
  const combined = await requestJson(`${schemaPrompt}\nMerge these chunk analyses into one concise, non-duplicative report. Keep at most 12 clauses, 8 risks, 6 findings, and 6 recommendations. Do not invent text not present in the partial results.\n\n${JSON.stringify(partials)}`, FINAL_OUTPUT_TOKENS);
  tokensUsed += combined.tokens;
  const analysis = combined.data;
  if (!analysis.summary || !Array.isArray(analysis.clauses) || !Array.isArray(analysis.risks)) throw new AnalysisError('INVALID_AI_RESPONSE', 'The AI response did not match the required report format.', 502, true);
  return { ...analysis, aiModel: MODEL, tokensUsed, chunksProcessed: chunks.length };
};

module.exports = { analyzeDocument, cleanText, splitIntoChunks, mapProviderError, AnalysisError };
