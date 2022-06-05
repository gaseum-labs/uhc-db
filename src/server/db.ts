import * as datastore from '@google-cloud/datastore';
import * as init from './init';
import * as auth from 'google-auth-library';
import * as access from './access';
import * as shared from '../shared/shared';
import type { RefreshBody, VerifyMinecraftCodeBody } from '../shared/apiTypes';

export type Keyed = { [datastore.Datastore.KEY]: datastore.Key };

export type VerifyCode = {
	code: string;
	uuid: string;
	username: string;
	expiration: number;
};

export type User = {
	data: number;
	permissions: number;
	botToken: string | undefined;
	minecraftUuid: string | undefined;
	minecraftUsername: string | undefined;
	discordId: string | undefined;
	discordUsername: string | undefined;
};

/* 600 seconds = 10 minutes */
export const VERIFY_EXPR_TIME = 600;

export const OBJ_USER = 'user';
export const OBJ_CODE = 'code';
export const OBJ_CODE_LINK = 'linkcode';

/* use app engine's integrated datastore service account if running on app engine */
/* otherwise use the account specified by the keys file */
export const ds = new datastore.Datastore(
	init.PROJECT_ID === undefined
		? {
				keyFilename: 'keys/db.json',
		  }
		: {
				projectId: init.PROJECT_ID,
		  },
);

const createDefaultUser = (): User => {
	return {
		data: Math.floor(Math.random() * 70),
		permissions: 0,
		botToken: undefined,
		minecraftUuid: undefined,
		minecraftUsername: undefined,
		discordId: undefined,
		discordUsername: undefined,
	};
};

export const getOrCreateUser = async (token: string | undefined) => {
	if (token === undefined) return undefined;

	/* parse the payload of the token and verify that it is valid */
	let ticket: auth.LoginTicket;
	try {
		ticket = await access.oauthClient.verifyIdToken({
			idToken: token,
			audience: access.webClient.client_id,
		});
	} catch (ex) {
		return undefined;
	}

	/* grab user from the db */
	const userId = ticket.getUserId();
	if (userId === null) return undefined;
	const key = ds.key([OBJ_USER, ds.int(userId)]);
	const [fetchedUser]: [(User & Keyed) | undefined] = await ds.get(key);

	/* create user if they don't exist */
	let user: User & Keyed;
	if (fetchedUser === undefined) {
		const defaultUser = createDefaultUser();
		await ds.save({
			key: key,
			data: defaultUser,
		});

		user = Object.assign(defaultUser, {
			[ds.KEY]: key,
		});
	} else {
		user = fetchedUser;
	}

	return user;
};

/* verify codes */

export const parseRefreshBody = (body: any): RefreshBody | undefined => {
	const refreshToken = body.refreshToken;
	if (typeof refreshToken !== 'string') return undefined;

	return { refreshToken };
};

export const updateUsersBotToken = async (user: User & Keyed) => {
	const token = access.generateBotToken();
	user.botToken = token;

	await ds.save({
		key: user[ds.KEY],
		data: user,
	});

	return token;
};

export const findBotToken = async (token: string) => {
	const [tokens]: [User[], any] = await ds.runQuery(
		ds.createQuery(OBJ_USER).filter('botToken', '=', token),
	);
	return tokens.length > 0;
};

/* verify codes */

const generateCode = (length: number) => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	return [...Array(length).keys()]
		.map(() => chars[shared.randomRange(0, chars.length - 1)])
		.join('');
};

export const createVerifyLink = async (uuid: string, username: string) => {
	const [existingCodes]: [(VerifyCode & Keyed)[], any] = await ds.runQuery(
		ds.createQuery(OBJ_CODE_LINK).filter('uuid', '=', uuid),
	);

	const code = generateCode(16);
	const link = `${shared.host}/link/${code}`;

	console.log(link);

	await ds.save({
		key:
			existingCodes.length === 0
				? ds.key([OBJ_CODE_LINK])
				: existingCodes[0][ds.KEY],
		data: {
			code,
			uuid,
			username,
			expiration: shared.nowSeconds() + VERIFY_EXPR_TIME,
		} as VerifyCode,
	});

	return link;
};

export const verifyLink = async (
	codeString: string,
	user: User & Keyed,
): Promise<'expired' | 'invalid' | 'success'> => {
	const [codes]: [(VerifyCode & Keyed)[], any] = await ds.runQuery(
		ds.createQuery(OBJ_CODE_LINK).filter('code', '=', codeString),
	);

	if (codes.length === 0) {
		return 'invalid';
	}

	const code = codes[0];

	if (shared.nowSeconds() > code.expiration) {
		ds.delete(code[ds.KEY]);
		return 'expired';
	}

	user.minecraftUsername = code.username;
	user.minecraftUuid = code.uuid;

	ds.save({
		key: user[ds.KEY],
		data: user,
	});

	ds.delete(code[ds.KEY]);

	return 'success';
};

export const updateDiscordInformation = (
	user: User & Keyed,
	id: string,
	username: string,
) => {
	user.discordId = id;
	user.discordUsername = username;
	return ds.save({
		key: user[ds.KEY],
		data: user,
	});
};
export const unlinkDiscord = (user: User & Keyed) => {
	user.discordId = undefined;
	user.discordUsername = undefined;
	return ds.save({
		key: user[ds.KEY],
		data: user,
	});
};
