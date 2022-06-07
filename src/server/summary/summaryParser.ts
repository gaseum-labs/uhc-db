import * as parser from '../parser';
import type { Summary, SummaryEntry, Team, Id } from '../../shared/shared';
import { PublishSummaryBody } from '../../shared/apiTypes';
import { Season } from './summary';

/*
 * file for getting summaries as uer input to endpoints
 */

export const parseTeam = <T>(
	body: any,
	andParse: (body: any) => T,
): Team & T => {
	const name = parser.parseField(body, 'name', 'string');
	const color0 = parser.parseField(body, 'color0', 'number');
	const color1 = parser.parseField(body, 'color1', 'number');
	const members = parser.parseArray(body, 'members', 'string');
	const additional = andParse(body);

	return Object.assign(
		{
			name,
			color0,
			color1,
			members,
		},
		additional,
	);
};

export const parseSummaryEntry = <T>(
	body: any,
	andParse: (body: any) => T,
): SummaryEntry & T => {
	const place = parser.parseField(body, 'place', 'number');
	const uuid = parser.parseField(body, 'uuid', 'string');
	const name = parser.parseField(body, 'name', 'string');
	const timeSurvived = parser.parseField(body, 'timeSurvived', 'number');
	const killedBy = parser.parseField(body, 'killedBy', 'string', true);
	const additional = andParse(body);

	return Object.assign(
		{
			place,
			uuid,
			name,
			timeSurvived,
			killedBy,
		},
		additional,
	);
};

const stripDate = (dateString: string) => {
	const first = dateString.split('[')[0];
	const date = new Date(first);
	if (isNaN(date.valueOf())) throw 'invalid date format';
	return date;
};

export const parseFullSummaryBody = <T>(
	body: any,
	andParse: (body: any) => T,
): Summary<T> => {
	const gameType = parser.parseField(body, 'gameType', 'string');
	const date = stripDate(parser.parseField(body, 'date', 'string'));
	const gameLength = parser.parseField(body, 'gameLength', 'number');
	const teams = parser.transformArray(body, 'teams', teamBody =>
		parseTeam(teamBody, andParse),
	);
	const players = parser.transformArray(body, 'players', entryBody =>
		parseSummaryEntry(entryBody, andParse),
	);
	const additional = andParse(body);

	return Object.assign(
		{
			gameType,
			date,
			gameLength,
			teams,
			players,
		},
		additional,
	);
};

export const parseId = (body: any): Id => {
	const id = parser.parseField(body, 'id', 'string');
	return { id };
};

export const parsePublishSummarybody = (body: any): PublishSummaryBody => {
	return {
		game: parser.parseField(body, 'game', 'number'),
		season: parser.parseField(body, 'season', 'number'),
	};
};

export const parseSeason = (body: any): Season => {
	return {
		logo: parser.parseField(body, 'logo', 'string'),
		color: parser.parseField(body, 'color', 'number'),
		champion: parser.parseField(body, 'champion', 'string', true),
	};
};
