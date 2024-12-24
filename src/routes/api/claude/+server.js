// src/routes/api/claude/+server.js
import { json } from '@sveltejs/kit';

function extractComponentCode(response) {
	// Extract the HTML code from Claude's response
	const content = response.content[0].text;

	// Look for code between ```html tags
	const codeMatch = content.match(/```html\n([\s\S]*?)```/);
	if (codeMatch) {
		return codeMatch[1].trim();
	}

	// If no code blocks found, return the raw response
	return content;
}
export async function POST({ request }) {
	const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
	const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

	const requestData = await request.json();

	try {
		const response = await fetch(CLAUDE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify(requestData)
		});

		if (!response.ok) {
			const errorData = await response.json();
			return json(
				{ error: errorData.error?.message || 'API request failed' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		const componentCode = extractComponentCode(data);
		return json({ component: componentCode });
	} catch (error) {
		return json({ error: error.message }, { status: 500 });
	}
}
