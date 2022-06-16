import axios from 'axios';
import type { ClientSummary } from '../../shared/shared';

type WebhookData = {
	id: string;
	token: string;
};

let data: WebhookData;

export const loadWebhookData = () => {};

const createUrl = () => {
	return `https://discord.com/api/webhooks/${data.id}/${data.token}`;
};

const timeString = (ticks: number) => {
	const seconds = Math.floor(ticks / 20) % 60;
	const minutes = Math.floor(ticks / (60 * 20));

	const secondsPart = seconds == 0 ? '' : `${seconds} second${}`;
};

export const postSummary = (seasonNo: number, summary: ClientSummary) => {
	//const params = new URLSearchParams();
//
	//params.append('content', data.clientId);
	//params.append('username', data.clientSecret);
	//params.append('avatar_url', 'authorization_code');
	//params.append('tts', code.toString());
	//params.append('embeds', data.redirectUri);
//
	//const content = {
	//	content: null,
	//	embeds: [
	//		{
	//			title: `${summary.gameType} Season ${seasonNo} Game ${summary.id}`,
	//			description: `Lasted ${summary.gameLength}`,
	//		},
	//	],
	//};
	//const tokenRequest = await axios.post(
	//	'https://discord.com/api/oauth2/token',
	//	params,
	//);
//
	//if (tokenRequest.status != 200) {
	//	util.makeError(400);
	//}
//
	//return tokenRequest.data.access_token as string;
};
