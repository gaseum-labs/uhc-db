import * as datastore from '@google-cloud/datastore';
import * as init from './init';
import * as auth from 'google-auth-library';
import * as access from './access';
import * as shared from '../shared/shared';
import type { RefreshBody, VerifyMinecraftCodeBody } from '../shared/apiTypes';

export type Keyed = { [datastore.Datastore.KEY]: datastore.Key };

export type VerifyCode = {
	clientId: string;
	code: string;
	expiration: number;
};

export type User = {
	data: number;
	permissions: number;
	botToken: string | undefined;
	minecraftUuid: string | undefined;
	minecraftUsername: string | undefined;
};

/* 600 seconds = 10 minutes */
export const VERIFY_EXPR_TIME = 600;

export const OBJ_USER = 'user';
export const OBJ_CODE = 'code';

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

const generateCode = () => {
	return String.fromCharCode(
		...[...Array(8).keys()].map(() => shared.randomRange(65, 90)),
	);
};

const createVerifyCode = (clientId: string): VerifyCode => {
	return {
		clientId: clientId,
		code: generateCode(),
		expiration: shared.nowSeconds() + VERIFY_EXPR_TIME,
	};
};

export const generateNewCode = async (user: User & Keyed) => {
	const clientId = user[ds.KEY].id!!;

	const [existingCodes]: [(VerifyCode & Keyed)[], any] = await ds.runQuery(
		ds.createQuery(OBJ_CODE).filter('clientId', '=', clientId),
	);

	const verifyCode = createVerifyCode(clientId);

	console.log('verify code:', verifyCode);

	/* create a new code if none exists */
	/* or overwrite existing code */
	await ds.save({
		key:
			existingCodes.length === 0
				? ds.key([OBJ_CODE])
				: existingCodes[0][ds.KEY],
		data: verifyCode,
	});

	return verifyCode;
};

export const parseVerifyMinecraftCodeBody = (
	body: any,
): VerifyMinecraftCodeBody | undefined => {
	const code = body.code;
	if (typeof code !== 'string') return undefined;
	const uuid = body.uuid;
	if (typeof uuid !== 'string') return undefined;
	const username = body.username;
	if (typeof username !== 'string') return undefined;

	return {
		code,
		uuid,
		username,
	};
};

export const parseRefreshBody = (body: any): RefreshBody | undefined => {
	const refreshToken = body.refreshToken;
	if (typeof refreshToken !== 'string') return undefined;

	return { refreshToken };
};

/**
 * @param code a user-supplied code to verify
 * @returns
 */
export const verifyMinecaftCode = async (code: string) => {
	const [codes]: [(VerifyCode & Keyed)[], any] = await ds.runQuery(
		ds.createQuery(OBJ_CODE).filter('code', '=', code.toUpperCase()),
	);

	if (codes.length === 0) {
		return undefined;
	} else {
		const verifyCode = codes[0];
		if (shared.nowSeconds() > verifyCode.expiration) {
			console.log(`Token has expired, past ${verifyCode.expiration}`);
			return undefined;
		}

		await ds.delete(verifyCode[ds.KEY]);

		return verifyCode;
	}
};

export const updateMinecraftLink = async (
	clientId: string,
	uuid: string,
	username: string,
) => {
	const key = ds.key([OBJ_USER, ds.int(clientId)]);
	const [user]: [User | undefined] = await ds.get(key);

	if (user === undefined) return;

	user.minecraftUuid = uuid;
	user.minecraftUsername = username;

	await ds.save({
		key: key,
		data: user,
	});
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
