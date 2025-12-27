// backend/services/aiService.js
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Analyze document with GPT-4
const analyzeDocument = async (text, documentName) => {
  try {
    console.log('🤖 Starting AI analysis...');
    console.log(`📄 Document: ${documentName}`);
    console.log(`📏 Text length: ${text.length} characters`);

    // Truncate text if too long (OpenAI has token limits)
    const maxChars = 40000; // Roughly 10k tokens
    const truncatedText = text.length > maxChars 
      ? text.substring(0, maxChars) + '\n\n[Text truncated for analysis...]'
      : text;

    console.log(`📏 Sending ${truncatedText.length} characters to OpenAI`);

    const prompt = `You are an expert legal document analyzer. Analyze this contract and provide a detailed analysis.

**Document:** ${documentName}

**Instructions:**
1. Provide a clear 2-3 paragraph summary
2. Extract 8-12 important clauses with their exact text from the document
3. Identify 3-5 potential risks
4. Give an overall risk score (0-100)
5. List 3-5 key findings

**IMPORTANT:** Respond with ONLY valid JSON. No markdown, no code blocks, no extra text.

**JSON Format:**
{
  "summary": "Brief overview of the document in 2-3 paragraphs",
  "clauses": [
    {
      "type": "payment|termination|liability|confidentiality|warranty|indemnification|governing_law|dispute_resolution|intellectual_property|non_compete|other",
      "text": "Exact text from the document",
      "riskLevel": "low|medium|high|critical",
      "explanation": "Brief explanation of what this clause means"
    }
  ],
  "risks": [
    {
      "severity": "low|medium|high|critical",
      "category": "financial|legal|operational|compliance|other",
      "description": "What is the risk",
      "recommendation": "How to mitigate this risk"
    }
  ],
  "overallRiskScore": 45,
  "keyFindings": [
    "First key finding",
    "Second key finding",
    "Third key finding"
  ]
}

**Contract Text:**
${truncatedText}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert legal document analyzer. You MUST respond with valid JSON only. No additional text, no markdown formatting, just pure JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" } // ✅ Force JSON response
    });

    const content = response.choices[0].message.content;
    console.log('✅ Received response from OpenAI');
    console.log(`📊 Tokens used: ${response.usage.total_tokens}`);

    // Parse JSON
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.log('📄 Raw response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate response structure
    if (!analysis.summary || !analysis.clauses || !analysis.risks) {
      throw new Error('Invalid analysis structure from AI');
    }

    console.log(`✅ Analysis complete:`);
    console.log(`   📋 Clauses: ${analysis.clauses.length}`);
    console.log(`   ⚠️  Risks: ${analysis.risks.length}`);
    console.log(`   📊 Risk Score: ${analysis.overallRiskScore}`);

    return {
      summary: analysis.summary,
      clauses: analysis.clauses,
      risks: analysis.risks,
      overallRiskScore: analysis.overallRiskScore || 0,
      keyFindings: analysis.keyFindings || [],
      recommendations: analysis.recommendations || [],
      aiModel: 'gpt-4o-mini',
      tokensUsed: response.usage.total_tokens
    };

  } catch (error) {
    console.error('❌ OpenAI error:', error);
    
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key');
    }
    
    throw new Error(`AI analysis failed: ${error.message}`);
  }
};

module.exports = {
  analyzeDocument
};