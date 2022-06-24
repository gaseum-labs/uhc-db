import * as datastore from '@google-cloud/datastore';
import * as init from './init';
import * as access from './access';
import * as shared from '../shared/shared';
import type { RefreshBody } from '../shared/apiTypes';
import { makeError } from './util';

/* serverside representation of id'd objects */
export type Keyed = { [datastore.Datastore.KEY]: datastore.Key };

export type VerifyCode = {
	code: string;
	uuid: string;
	username: string;
	expiration: number;
};

export type UploadUser = {
	permissions: number;
	botToken: string | undefined;
	discordUsername: string;
	minecraftUuid: string | undefined;
	minecraftUsername: string | undefined;
};

export type DbUser = UploadUser & Keyed;

export type DataUser = UploadUser & {
	discordId: string;
};

/* 600 seconds = 10 minutes */
export const VERIFY_EXPR_TIME = 600;

export const OBJ_USER = 'user';
export const OBJ_CODE = 'code';
export const OBJ_SEASON = 'season';
export const OBJ_SUMMARY = 'summary';
export const OBJ_TEAM = 'team';
export const OBJ_SUMMARY_ENTRY = 'summaryEntry';
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

const createDefaultUser = (discordUsername: string): UploadUser => {
	return {
		permissions: 0,
		botToken: undefined,
		discordUsername,
		minecraftUuid: undefined,
		minecraftUsername: undefined,
	};
};

export const toDataUser = (user: DbUser): DataUser => {
	return {
		permissions: user.permissions,
		botToken: user.botToken,
		discordUsername: user.discordUsername,
		minecraftUuid: user.minecraftUuid,
		minecraftUsername: user.minecraftUsername,

		discordId: user[ds.KEY].id!,
	};
};

export const toUploadUser = (user: DataUser): UploadUser => {
	return {
		permissions: user.permissions,
		botToken: user.botToken,
		discordUsername: user.discordUsername,
		minecraftUuid: user.minecraftUuid,
		minecraftUsername: user.minecraftUsername,
	};
};

const uploadUser = (user: DataUser) => {
	return ds.save({
		key: ds.key([OBJ_USER, ds.int(user.discordId)]),
		data: toUploadUser(user),
	});
};

export const getUser = async (token: string) => {
	const userId = access.verifyJWT(token);
	if (userId === undefined) return undefined;

	const key = ds.key([OBJ_USER, ds.int(userId)]);
	const [fetchedUser]: [DbUser | undefined] = await ds.get(key);

	if (fetchedUser === undefined) return undefined;

	return toDataUser(fetchedUser);
};

export const getOrCreateUser = async (identity: access.DiscordIdentity) => {
	/* grab user from the db */
	const key = ds.key([OBJ_USER, ds.int(identity.id)]);
	const [fetchedUser]: [DbUser | undefined] = await ds.get(key);

	/* create user if they don't exist */
	let user: DataUser;
	if (fetchedUser === undefined) {
		const defaultUser = createDefaultUser(identity.username);
		await ds.save({
			key: key,
			data: defaultUser,
		});

		user = Object.assign(defaultUser, {
			discordId: identity.id,
		});

		/* update the user's discord identity if they do exist */
	} else {
		const requireUpdate = identity.username !== fetchedUser.discordUsername;

		user = Object.assign(fetchedUser, {
			discordId: identity.id,
			discordUsername: identity.username,
		});

		if (requireUpdate) {
			await uploadUser(user);
		}
	}

	return user;
};

/* verify codes */

export const parseRefreshBody = (body: any): RefreshBody | undefined => {
	const refreshToken = body.refreshToken;
	if (typeof refreshToken !== 'string') return undefined;

	return { refreshToken };
};

export const updateUsersBotToken = async (user: DataUser) => {
	const token = access.generateBotToken();
	user.botToken = token;

	await uploadUser(user);

	return token;
};

export const findBotToken = async (token: string) => {
	const [tokens]: [DbUser[], any] = await ds.runQuery(
		ds
			.createQuery(OBJ_USER)
			.filter('botToken', '=', token)
			.select('__key__'),
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
	const link = `${access.config.host}/link/${code}`;

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
	user: DataUser,
): Promise<'expired' | 'invalid' | 'success'> => {
	const [codes]: [(VerifyCode & Keyed)[], any] = await ds.runQuery(
		ds.createQuery(OBJ_CODE_LINK).filter('code', '=', codeString),
	);

	if (codes.length === 0) {
		return 'invalid';
	}

	const code = codes[0];

	if (shared.nowSeconds() > code.expiration) {
		await ds.delete(code[ds.KEY]);
		return 'expired';
	}

	user.minecraftUsername = code.username;
	user.minecraftUuid = code.uuid;

	await Promise.all([uploadUser(user), ds.delete(code[ds.KEY])]);

	return 'success';
};

export const unlink = async (minecraftUuid: string) => {
	const [users]: [DbUser[], any] = await ds.runQuery(
		ds
			.createQuery(OBJ_USER)
			.filter('minecraftUuid', '=', minecraftUuid)
			.limit(1),
	);
	const user =
		users[0] ?? makeError(404, 'No user with this MinecraftId exists');

	user.minecraftUuid = undefined;
	user.minecraftUsername = undefined;

	await uploadUser(toDataUser(user));

	return user.discordUsername;
};

export const getDiscordIdFor = async (uuid: string) => {
	const [users]: [Keyed[], any] = await ds.runQuery(
		ds
			.createQuery(OBJ_USER)
			.filter('minecraftUuid', '=', uuid)
			.select('__key__')
			.limit(1),
	);

	if (users.length === 0) {
		return undefined;
	}

	return users[0][ds.KEY].id!;
};

export const getMassDiscordIdsFor = async (uuids: string[]) => {
	const [users]: [({ minecraftUuid: string } & Keyed)[], any] =
		await ds.runQuery(
			ds.createQuery(OBJ_USER).filter('minecraftUuid', 'IN', uuids),
		);

	const result: { [uuid: string]: string | null } = {};

	for (const uuid of uuids) {
		result[uuid] = null;
	}
	for (const user of users) {
		result[user.minecraftUuid] = user[ds.KEY].id!;
	}

	return result;
};
