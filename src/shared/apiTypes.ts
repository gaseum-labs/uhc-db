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
	token: String;
};
