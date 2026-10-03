import { api } from '@/lib/api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const aiService = {
    parseStreamData: (data: any): any => {
        if (typeof data !== 'string') {
            return data;
        }

        // If it's a raw JSON string that looks like our suspect object, return it as a string
        if (data.startsWith('{') && data.includes('"name"') && data.includes('"description"')) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.description) return parsed.description;
                if (parsed.content) return parsed.content;
                return data; // Return original string if we can't find a better field
            } catch (e) {
                // Not valid JSON or other error, continue
            }
        }

        // If it doesn't look like streaming data, return as is
        if (!data.includes('data: ') && !data.includes('"delta":')) {
            return data;
        }

        let reconstructedText = '';

        // Standard SSE format data: data: {"type": "text-delta", "delta": "..."}
        // Splitting by 'data:' and filtering out metadata
        const lines = data.split('\n');
        
        for (const line of lines) {
            let content = line.trim();
            if (content.startsWith('data: ')) {
                content = content.substring(6).trim();
            }
            
            if (!content || content === '[DONE]') continue;

            try {
                // If it's a JSON object, parse it
                if (content.startsWith('{')) {
                    const parsed = JSON.parse(content);
                    if (parsed.type === 'text-delta' && parsed.delta) {
                        reconstructedText += parsed.delta;
                    } else if (parsed.choices?.[0]?.delta?.content) {
                        reconstructedText += parsed.choices[0].delta.content;
                    } else if (parsed.delta) {
                        reconstructedText += parsed.delta;
                    } else if (parsed.content && typeof parsed.content === 'string') {
                        reconstructedText += parsed.content;
                    }
                }
            } catch (e) {
                // Not JSON, skip
            }
        }

        // Fallback: If we got nothing but the string definitely has deltas, use regex
        if (!reconstructedText.trim()) {
            const deltaRegex = /"delta"\s*:\s*"((?:\\.|[^"\\])*)"/g;
            let match;
            while ((match = deltaRegex.exec(data)) !== null) {
                try {
                    const unescaped = JSON.parse(`"${match[1]}"`);
                    reconstructedText += unescaped;
                } catch {
                    reconstructedText += match[1];
                }
            }
        }

        const result = reconstructedText.trim();
        return result || data;
    },

    chat: async (messages: ChatMessage[]) => {
        // If mock mode is enabled via env or runtime toggle, simulate a response
        const runtimeMock = typeof window !== 'undefined' && localStorage.getItem('useMockAI') === 'true';
        if (runtimeMock || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'This is a mock response from GreenCRM AI.'
            };
        }

        // Prepare a minimal messages payload for the backend/LLM provider
        const payloadMessages = messages.map(m => ({ role: m.role, content: (m as any).content }));

        try {
            const response = await api.post('/ai/chat', { messages: payloadMessages });
            const data = aiService.parseStreamData(response.data);

            if (typeof data === 'string') {
                return {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: data
                };
            }
            return data;
        } catch (error: any) {
            console.error('AI chat failed:', error);

            // If unauthorized or missing token, provide a helpful fallback for local development
            const status = error?.response?.status;
            if (status === 401 || status === 403 || !localStorage.getItem('accessToken')) {
                // Return a soft-failure assistant message so the UI remains usable
                return {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content:
                        "AI unavailable: please sign in to use live AI features. Showing a local fallback response instead."
                };
            }

            // Otherwise rethrow so callers can surface the error
            throw error;
        }
    },

    researchCompany: async (query: string, localCsvContext: Array<Record<string, string | number | boolean | null>> = []) => {
        const cleanQuery = query.trim();
        if (!cleanQuery) throw new Error('Enter a company name or website to research.');
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 800));
            return {
                metadata: {
                    intent: 'research_company',
                    query: cleanQuery,
                    timestamp: new Date().toISOString(),
                    generated_by: 'demo_fallback',
                    data_sources: []
                },
                account: {
                    name: cleanQuery,
                    website: null,
                    industry: null,
                    description: 'Demo mode is enabled, so live company research is unavailable. Set VITE_USE_MOCK_DATA=false and sign in to a live backend to research this company.'
                },
                contacts: [],
                leads: [],
                products: [],
                use_cases: [],
                tech_stack: [],
                customer_segments: [],
                partnerships: [],
                competitors: [],
                funding: { investors: [] },
                sales_insights: { pain_points: [], opportunities: [] },
                market_analysis: { market_trends: [], opportunities: [], competitor_landscape: [] },
                sources: []
            };
        }
        const response = await api.post('/ai/research-company', { query: cleanQuery, localCsvContext }, { timeout: 60000 });
        return response.data;
    },

    enhanceCompanyInfo: async (name: string, website: string, description: string) => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return `${name} is a globally recognized leader in its sector, known for driving innovation at the intersection of technology and business strategy. With their platform accessible at ${website}, they have redefined how enterprises approach digital transformation, offering unparalleled efficiency and scalable solutions. Their market positioning is strengthened by a commitment to excellence and a forward-thinking product roadmap that addresses the complex needs of modern global markets.`;
        }

        try {
            const response = await api.post('/ai/enhance-company', {
                name,
                website,
                description
            });

            const data = response.data;
            let result = data;
            if (data?.content) result = data.content;

            // Safety: if the result is still an object, try to extract description or stringify
            if (typeof result === 'object' && result !== null) {
                return result.description || result.content || result.name || JSON.stringify(result);
            }

            return result || description;
        } catch (error) {
            console.error('Error enhancing company info:', error);
            return description;
        }
    }
};
