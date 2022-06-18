import { DataUser } from '../server/db';
import { Id, SummaryHeader } from './shared';

export type GetMinecraftCodeResponse = {
	code: string;
};

export type VerifyMinecraftCodeBody = {
	code: string;
	uuid: string;
	username: string;
};

export type RefreshBody = {
	refreshToken: string;
};

export type RefreshResponse = {
	token: string;
};

export type PublishSummaryBody = {
	game: number;
	season: number;
};

export type PaginateSummariesResponse = {
	summaries: (SummaryHeader & Id)[];
	cursor: string | undefined;
};

export type GlobalProps = {
	user?: DataUser;
};
