import ApiError from '../utils/ApiError.ts';
import OpenAI from 'openai';

const shouldUseMockAI = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('test-') || process.env.OPENAI_API_KEY === 'test-openai-key';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CUSTOM_AI_URL = process.env.CUSTOM_AI_URL;
const CUSTOM_AI_KEY = process.env.CUSTOM_AI_KEY;
const CUSTOM_AI_AUTH_HEADER = process.env.CUSTOM_AI_AUTH_HEADER || 'Authorization';
const CUSTOM_AI_AUTH_SCHEME = process.env.CUSTOM_AI_AUTH_SCHEME || 'Bearer';
const useCustomAI = Boolean(CUSTOM_AI_URL);

const API_KEY = process.env.UPTIQ_API_KEY;
const API_SECRET = process.env.UPTIQ_API_SECRET;
const AGENT_ID = process.env.UPTIQ_AGENT_ID;
const AGENT_URL = `${process.env.UPTIQ_API_BASE_URL}/v1/agents/${AGENT_ID}/execute`;

const customAIRequest = async (payload: any) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (CUSTOM_AI_KEY) {
    headers[CUSTOM_AI_AUTH_HEADER] = `${CUSTOM_AI_AUTH_SCHEME} ${CUSTOM_AI_KEY}`;
  }

  const response = await fetch(CUSTOM_AI_URL!, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new ApiError(response.status, `Custom AI request failed: ${errorData}`);
  }

  return response.json();
};

const parseAIResponseContent = (response: any) => {
  if (!response) return '';
  if (typeof response === 'string') return response;
  if (response.choices?.[0]?.message?.content) return response.choices[0].message.content;
  if (response.choices?.[0]?.text) return response.choices[0].text;
  if (typeof response.content === 'string') return response.content;
  if (response.data && typeof response.data === 'string') return response.data;
  return JSON.stringify(response);
};

const getMockResearchCompanyResponse = (query: string) => ({
  metadata: {
    intent: 'research_company',
    query,
    timestamp: new Date().toISOString(),
    generated_by: 'mock_ai_research_agent',
    data_sources: ['Mock Data']
  },
  account: {
    account_id: `ACC-${Math.floor(Math.random() * 10000)}`,
    name: query,
    website: `https://${query.toLowerCase().replace(/\s+/g, '')}.com`,
    industry: 'Technology',
    sub_industry: 'Software',
    market_segment: 'Enterprise',
    business_model: 'SaaS',
    hq: 'San Francisco, CA',
    founded_year: '2015',
    employee_count: 1200,
    public_company: false,
    description: `${query} is a leading technology company specializing in innovative software solutions for modern businesses.`,
    market_positioning: 'Market leader in intelligent CRM solutions'
  },
  products: ['Platform Suite', 'Sales Accelerator'],
  use_cases: ['Sales automation', 'Lead intelligence'],
  tech_stack: ['React', 'TypeScript', 'Node.js'],
  customer_segments: ['Mid-market', 'Enterprise'],
  partnerships: ['AWS', 'Google Cloud'],
  competitors: ['Competitor A', 'Competitor B'],
  funding: {
    total_raised: '$120M',
    last_round: 'Series C',
    investors: ['Global Ventures']
  },
  contacts: [
    {
      contact_id: 'CON-001',
      name: 'John Doe',
      role: 'CEO',
      department: 'Executive',
      linkedin: 'linkedin.com/in/johndoe',
      email: `john@${query.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '+1-555-0100',
      contact_type: 'decision_maker',
      influence_level: 'High',
      lead_score: 92
    }
  ],
  leads: [
    {
      lead_id: 'LEAD-001',
      target_role: 'Director of Sales',
      department: 'Sales',
      priority: 'High',
      reason: 'Expansion into new enterprise markets',
      recommended_contact_strategy: 'Email outreach with ROI-focused messaging'
    }
  ],
  deals: [
    {
      deal_id: 'DEAL-001',
      account_id: 'ACC-001',
      deal_name: 'Enterprise CRM Rollout',
      stage: 'Negotiation',
      value_estimate: 450000,
      probability: 70,
      owner: 'Sales Team'
    }
  ],
  emails: [
    {
      email_id: 'EML-001',
      contact: 'John Doe',
      subject: 'CRM onboarding next steps',
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      summary: 'Followed up on onboarding timeline and pricing.'
    }
  ],
  call_logs: [
    {
      call_id: 'CAL-001',
      contact: 'John Doe',
      duration_seconds: 300,
      timestamp: new Date().toISOString(),
      outcome: 'Positive',
      notes: 'Client is interested in a pilot program.'
    }
  ],
  sales_insights: {
    pain_points: ['Data silos', 'Manual sales processes'],
    opportunities: ['AI-driven lead scoring', 'Improved sales forecasting'],
    value_proposition: 'Enable smarter sales execution with real-time insights.',
    suggested_pitch: `Highlight how ${query} can scale faster with better CRM intelligence and automation.`
  },
  market_analysis: {
    industry: 'SaaS',
    market_trends: ['AI adoption in sales', 'Automation of customer engagement'],
    opportunities: ['Expand into international markets'],
    competitor_landscape: ['Competitor A', 'Competitor B']
  },
  outreach_strategy: {
    target_roles: ['Head of Sales', 'Chief Revenue Officer'],
    channels: ['Email', 'LinkedIn'],
    messaging_angles: ['ROI-focused', 'Efficiency improvements']
  },
  lead_discovery: {
    target_roles: ['VP Sales', 'Head of Growth'],
    estimated_buying_team_size: 6,
    recommended_departments: ['Sales', 'Marketing']
  },
  ai_summary: {
    account_value: '$1.1M',
    deal_potential: '$540K',
    best_entry_point: 'Sales leadership',
    recommended_next_step: 'Secure a discovery call with the CRO.'
  }
});

export const executeAgent = async (query: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

  try {
    const response = await fetch(AGENT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY!,
        'X-API-Secret': API_SECRET!,
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Failed to execute AI agent');
    }

    const data = await response.json();

    if (data.content && typeof data.content === 'string') {
      try {
        data.data = JSON.parse(data.content);
      } catch (e) {
        console.error('Failed to parse agent content as JSON:', e);
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : 'Internal Server Error');
  }
};

export const researchCompany = async (query: string) => {
  const systemPrompt = `You are an AI research agent for a CRM system.

Your job is to research a company from a simple user query and return structured CRM intelligence. Go very deep in your research to provide the most accurate and detailed information possible.

IMPORTANT RULES:

1. Output MUST be valid JSON.
2. Do NOT include explanations or markdown.
3. If a field cannot be found, use null or an empty array.
4. Facilitate realistic emails and phone numbers. If exact ones are not found, use highly probable formats based on the company's domain (e.g., first.last@company.com) and regional phone patterns. Avoid vague placeholders.
5. Only include data that is publicly discoverable or highly probable based on industry standards.
6. All JSON keys must remain exactly as defined in the schema.
7. employee_count MUST be an integer (number), not a string.
8. For public companies, funding should be null and public_company should be set to true.
9. Populate EVERY field in the JSON schema with deep, research-backed data. If data is unavailable, use realistic simulated data that fits the company context (especially for deals, activities, emails, and call logs).

Steps you must follow:

1. Extract the company name and intent from the query.
2. Research the company deeply:
- industry, products, market position, competitors, funding, leadership.
3. Identify potential decision makers and sales leads with realistic contact info.
4. Generate deep sales insights, outreach strategy, and comprehensive CRM data (deals, activities, emails, call logs, etc.).
5. Populate the JSON schema below accurately and thoroughly.

Return ONLY the JSON object.

JSON SCHEMA:
{
  "metadata": {
    "intent": "",
    "query": "",
    "timestamp": "",
    "generated_by": "ai_research_agent",
    "data_sources": []
  },
  "account": {
    "account_id": "",
    "name": "",
    "website": "",
    "industry": "",
    "sub_industry": "",
    "market_segment": "",
    "business_model": "",
    "hq": "",
    "founded_year": "",
    "employee_count": 0,
    "public_company": false,
    "description": "",
    "market_positioning": ""
  },
  "products": [],
  "use_cases": [],
  "tech_stack": [],
  "customer_segments": [],
  "partnerships": [],
  "competitors": [],
  "funding": {
    "total_raised": "",
    "last_round": "",
    "investors": []
  },
  "contacts": [
    {
      "contact_id": "",
      "name": "",
      "role": "",
      "department": "",
      "linkedin": "",
      "email": null,
      "phone": null,
      "contact_type": "decision_maker",
      "influence_level": "",
      "lead_score": 0
    }
  ],
  "leads": [
    {
      "lead_id": "",
      "target_role": "",
      "department": "",
      "priority": "",
      "reason": "",
      "recommended_contact_strategy": ""
    }
  ],
  "deals": [
    {
      "deal_id": "",
      "account_id": "",
      "deal_name": "",
      "stage": "prospecting",
      "value_estimate": null,
      "probability": 0,
      "owner": "",
      "associated_contacts": [],
      "created_at": ""
    }
  ],
  "activities": [
    {
      "activity_id": "",
      "type": "research",
      "lead": "",
      "sales_rep": "",
      "timestamp": "",
      "outcome": "",
      "notes": ""
    }
  ],
  "interaction_history": [
    {
      "interaction_id": "",
      "contact": "",
      "channel": "",
      "timestamp": "",
      "summary": "",
      "sentiment": ""
    }
  ],
  "call_logs": [
    {
      "call_id": "",
      "contact": "",
      "duration_seconds": 0,
      "timestamp": "",
      "outcome": "",
      "notes": ""
    }
  ],
  "emails": [
    {
      "email_id": "",
      "contact": "",
      "subject": "",
      "timestamp": "",
      "direction": "outbound",
      "summary": ""
    }
  ],
  "sales_insights": {
    "pain_points": [],
    "opportunities": [],
    "value_proposition": "",
    "suggested_pitch": ""
  },
  "market_analysis": {
    "industry": "",
    "market_trends": [],
    "opportunities": [],
    "competitor_landscape": []
  },
  "outreach_strategy": {
    "target_roles": [],
    "channels": [],
    "messaging_angles": []
  },
  "lead_discovery": {
    "target_roles": [],
    "estimated_buying_team_size": 0,
    "recommended_departments": []
  },
  "ai_summary": {
    "account_value": "",
    "deal_potential": "",
    "best_entry_point": "",
    "recommended_next_step": ""
  }
}`;

  try {
    if (shouldUseMockAI) {
      return getMockResearchCompanyResponse(query);
    }

    let content: string;
    if (useCustomAI) {
      const customResponse = await customAIRequest({
        model: process.env.OPENAI_API_KEY ? process.env.LLM_MODEL || 'gpt-4o-mini' : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.3,
      });
      content = parseAIResponseContent(customResponse) || '{}';
    } else {
      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.3,
      });
      content = completion.choices[0].message.content || '{}';
    }

    try {
      return JSON.parse(content);
    } catch {
      return {
        error: 'Model returned invalid JSON',
        raw: content,
      };
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to generate structured company data');
  }
};

export const enhanceCompanyInfo = async (name: string, website: string, description: string) => {
  const prompt = `You are a high-end corporate researcher. Enhance the following company profile using your knowledge and web search capabilities.
    
    Company Name: ${name}
    Website: ${website}
    Current Description: ${description}
    
    Provide an enhanced, professional, and detailed company description (approx 3-4 sentences). 
    Focus on their value proposition, industry impact, and core market positioning.
    Return ONLY the enhanced description text.`;

  try {
    if (shouldUseMockAI) {
      return {
        content: `${name} is a leading company in its sector with a strong track record of delivering innovative solutions. Based on its website and description, it positions itself as a customer-centric brand that modernizes operations for fast-growth organizations. The company combines deep industry expertise and technology-driven services to accelerate digital transformation, improve operational efficiency, and support long-term business growth.`
      };
    }

    let responseContent: string;
    if (useCustomAI) {
      const customResponse = await customAIRequest({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional business analyst specializing in company research.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      responseContent = parseAIResponseContent(customResponse);
    } else {
      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional business analyst specializing in company research.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      responseContent = completion.choices[0].message.content || '';
    }

    return { content: responseContent };
  } catch (error) {
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to enhance company info');
  }
};