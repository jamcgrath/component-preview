// src/routes/api/claude/+server.js
import { json } from '@sveltejs/kit';

function extractComponentCode(response) {
	try {
		// Add debug logging
		console.log('Raw response from Claude:', response);

		// Extract the HTML code from Claude's response
		if (!response.content || !response.content[0] || !response.content[0].text) {
			console.error('Unexpected response structure:', response);
			throw new Error('Invalid response structure from Claude');
		}

		const content = response.content[0].text;
		console.log('Content extracted:', content);

		// Look for code between ```html tags
		const codeMatch = content.match(/```html\n([\s\S]*?)```/);
		if (codeMatch) {
			return codeMatch[1].trim();
		}

		// If no code blocks found, return the raw response
		return content;
	} catch (error) {
		console.error('Error extracting component code:', error);
		throw new Error('Failed to extract component code: ' + error.message);
	}
}

export async function POST({ request }) {
	const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
	const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

	try {
		const { requestData, assets } = await request.json();
		console.log('Request data:', JSON.stringify(requestData, null, 2));

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
			console.error('Claude API error:', errorData);
			return json(
				{ error: errorData.error?.message || 'API request failed' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		console.log('Claude response:', JSON.stringify(data, null, 2));

		let componentCode = extractComponentCode(data);
		if (!componentCode) {
			throw new Error('No component code found in response');
		}

		// Replace asset IDs with their URLs
		if (assets && assets.length > 0) {
			assets.forEach((asset) => {
				const assetPattern = new RegExp(`src="${asset.id}"`, 'g');
				componentCode = componentCode.replace(assetPattern, `src="${asset.url}"`);
			});
		}

		console.log('Final component code:', componentCode);
		return json({
			component: componentCode,
			token_usage: data.usage
		});
	} catch (error) {
		console.error('Server error:', error);
		return json(
			{
				error: 'Failed to generate component: ' + error.message,
				details: error.stack
			},
			{
				status: 500
			}
		);
	}
}
