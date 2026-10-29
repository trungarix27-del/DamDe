const fetch = require('node-fetch');

const BASE_URL = process.env.VITE_LOCAL_LLM_BASE_URL || 'https://rush-city-football-approved.trycloudflare.com';
const HEADERS = { 'Content-Type': 'application/json' };

async function testStreamingAndThinking() {
    console.log('\n--- 1. Testing Streaming & Thinking Strip ---');
    const body = {
        messages: [{ role: 'user', content: 'What is 15 * 24? Explain step by step.' }],
        max_tokens: 300,
        temperature: 0.1,
        mode: 'instruct',
        enable_thinking: true,
        reasoning_effort: 'high',
        stream: true
    };

    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('Streaming request failed:', response.status, await response.text());
            return;
        }

        let rawOutput = '';
        let strippedOutput = '';
        let isInsideThink = false;
        
        // Mock streaming read (node-fetch body is a readable stream)
        const decoder = new TextDecoder();
        for await (const chunk of response.body) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                        const data = JSON.parse(dataStr);
                        const delta = data.choices?.[0]?.delta?.content || '';
                        rawOutput += delta;
                        
                        // Fake strip logic inline to test
                        let processedDelta = delta;
                        if (processedDelta.includes('<think>')) {
                            isInsideThink = true;
                            processedDelta = processedDelta.split('<think>')[0];
                        }
                        if (processedDelta.includes('</think>')) {
                            isInsideThink = false;
                            processedDelta = processedDelta.split('</think>')[1];
                        }
                        
                        if (!isInsideThink && delta !== '<think>' && delta !== '</think>') {
                             strippedOutput += processedDelta;
                        }
                        
                    } catch (e) {}
                }
            }
        }
        console.log('RAW OUTPUT (includes <think>):', rawOutput.replace(/\n/g, '\\n').substring(0, 150) + '...');
        console.log('STRIPPED OUTPUT:', strippedOutput.replace(/\n/g, '\\n').substring(0, 150) + '...');
        console.log('Thinking strip success:', rawOutput.includes('<think>') && !strippedOutput.includes('<think>'));
    } catch (e) {
        console.error('Streaming test error:', e);
    }
}

async function testGrammarString() {
    console.log('\n--- 2. Testing grammar_string (BNF for Structured Output) ---');
    // Simple grammar strictly enforcing a JSON with character profile
    const grammar = `root ::= "{" ws "\\"name\\"" ws ":" ws string "," ws "\\"role\\"" ws ":" ws string "}"
ws ::= [ \\t\\n]*
string ::= "\\"" [^"]* "\\""`;

    const body = {
        prompt: "Extract character info. The character is John, a brave knight.\nOutput strictly following the grammar:\n",
        max_tokens: 100,
        temperature: 0.1,
        grammar_string: grammar,
        stream: false
    };

    try {
        const response = await fetch(`${BASE_URL}/v1/completions`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body)
        });
        const data = await response.json();
        console.log('Grammar Output:', data.choices?.[0]?.text);
        
        try {
            JSON.parse(data.choices?.[0]?.text);
            console.log('Grammar Valid JSON: YES');
        } catch(e) {
            console.log('Grammar Valid JSON: NO');
        }
    } catch (e) {
        console.error('Grammar test error:', e);
    }
}

async function testToolCalling() {
    console.log('\n--- 3. Testing Tool Calling ---');
    const body = {
        messages: [{ role: 'user', content: 'Search the wiki for "Harry Potter"' }],
        tools: [
            {
                type: 'function',
                function: {
                    name: 'googleSearch',
                    description: 'Search for fandom data',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string' }
                        },
                        required: ['query']
                    }
                }
            }
        ],
        max_tokens: 150,
        temperature: 0.1,
        mode: 'instruct',
        stream: false
    };

    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body)
        });
        const data = await response.json();
        const choices = data.choices || [];
        if (choices.length > 0) {
            const msg = choices[0].message;
            console.log('Finish Reason:', choices[0].finish_reason);
            console.log('Tool Calls Payload:', JSON.stringify(msg.tool_calls, null, 2));
            console.log('Direct Content:', msg.content);
        } else {
             console.log('No choices returned.');
        }
    } catch (e) {
        console.error('Tool calling test error:', e);
    }
}

async function runAll() {
    await testStreamingAndThinking();
    await testGrammarString();
    await testToolCalling();
}

runAll();
