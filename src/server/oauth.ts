import * as fs from 'fs/promises';

// todo fix
export let clientId: string = '';
export let clientSecret: string = '';

export const readOauthCredientials = async () => {
	const file = await fs.readFile('keys/oauth.json');
	const data = JSON.parse(file.toString());
	clientId = data.client_id;
	clientSecret = data.client_secret;
	if (!clientId || !clientSecret)
		console.error(
			`Client id and secret cannot be read. Please ensure you have created an oauth.json in the keys folder.`,
		);
};
