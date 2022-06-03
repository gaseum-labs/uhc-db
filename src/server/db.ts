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
};

export type Season = {
	logo: string;
	color: number;
	champion: string | undefined;
};

export type Summary = {
	gameType: string;
	date: Date;
	gameLength: number;
};

export type FullSummary = Summary & {
	teams: Team[];
	players: SummaryEntry[];
};

export type SummaryEntry = {
	place: number;
	uuid: string;
	name: string;
	timeSurvived: number;
	killedBy: string | undefined;
};

export type Team = {
	name: string;
	color0: number;
	color1: number;
	members: string[];
};

/* 600 seconds = 10 minutes */
export const VERIFY_EXPR_TIME = 600;
export const PAGE_SIZE = 10;

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

/* SUMMARIES */

export const parseField = (
	body: any,
	name: string,
	type: string,
	nullable: boolean = false,
) => {
	const field = body[name];
	if (typeof field !== type && !(nullable && field === undefined)) {
		throw `Expected ${name} to be a ${type}`;
	}
	return field;
};

export const parseArray = (body: any, name: string, type: string) => {
	const field = body[name];
	if (!Array.isArray(field)) {
		throw `Expected ${name} to be an Array`;
	}
	for (let sub of field) {
		if (typeof sub !== type) {
			throw `Expected entries of ${name} to be a ${type}`;
		}
	}
	return field;
};

export const transformArray = <T>(
	body: any,
	name: string,
	transform: (body: any) => T,
) => {
	const field = body[name];
	if (!Array.isArray(field)) {
		throw `Expected ${name} to be an Array`;
	}
	const ret: T[] = Array(field.length);
	for (let sub of field) {
		ret.push(transform(sub));
	}
	return ret;
};

export const parseTeam = (body: any): Team => {
	const name = parseField(body, 'name', 'string');
	const color0 = parseField(body, 'color0', 'number');
	const color1 = parseField(body, 'color1', 'number');
	const members = parseArray(body, 'members', 'string');

	return {
		name,
		color0,
		color1,
		members,
	};
};

export const parseSummaryEntry = (body: any): SummaryEntry => {
	const place = parseField(body, 'place', 'number');
	const uuid = parseField(body, 'uuid', 'string');
	const name = parseField(body, 'name', 'string');
	const timeSurvived = parseField(body, 'timeSurvived', 'number');
	const killedBy = parseField(body, 'killedBy', 'string', true);

	return {
		place,
		uuid,
		name,
		timeSurvived,
		killedBy,
	};
};

export const parseFullSummaryBody = (body: any): FullSummary => {
	const gameType = parseField(body, 'gameType', 'string');
	const date = new Date(parseField(body, 'date', 'string'));
	const gameLength = parseField(body, 'gameLength', 'number');
	const teams = transformArray(body, 'teams', parseTeam);
	const players = transformArray(body, 'players', parseSummaryEntry);

	return {
		gameType,
		date,
		gameLength,
		teams,
		players,
	};
};

export const updateSeason = (seasonNo: number, season: Season) => {
	const key = ds.key([OBJ_SEASON, ds.int(seasonNo)]);

	return ds.save({
		key: key,
		data: season,
	});
};

export const uploadSummary = async (fullSummary: FullSummary) => {
	const summaryKey = ds.key([OBJ_SUMMARY]);
	const summary: Summary = {
		gameType: fullSummary.gameType,
		date: fullSummary.date,
		gameLength: fullSummary.gameLength,
	};

	/* get the newly uploaded summary key */
	await ds.save({
		key: summaryKey,
		data: summary,
	});

	const refKey = ds.int(summaryKey.id!!);

	return Promise.all([
		ds.save(
			fullSummary.teams.map(team => ({
				key: ds.key([OBJ_SUMMARY, refKey, OBJ_TEAM]),
				data: team,
			})),
		),
		ds.save(
			fullSummary.players.map(entry => ({
				key: ds.key([OBJ_SUMMARY, refKey, OBJ_SUMMARY_ENTRY]),
				data: entry,
			})),
		),
	]);
};

export const deleteSummary = (id: string) => {
	return ds.delete(ds.key([OBJ_SUMMARY, ds.int(id)]));
};

export const getSummaryCursor = async (
	pageCursor: string | undefined,
): Promise<[Summary[], string | undefined]> => {
	let query = ds.createQuery(OBJ_SUMMARY).limit(PAGE_SIZE);

	if (pageCursor !== undefined) {
		query = query.start(pageCursor);
	}

	const [entities, info]: [Summary[], any] = await ds.runQuery(query);

	return [entities, info.endCursor];
};

//export const officializeSummary = (
//	oldId: string,
//	gameNo: number,
//	seasonNo: number,
//) => {
//	const summary;
//};
