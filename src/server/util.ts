import * as express from 'express';

export type Error = {
	code: number;
	message: string;
};

const errorMessages = {
	400: 'Bad Request',
	401: 'Unauthorized',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
};

export const makeError = (
	code: 400 | 401 | 403 | 404 | 405,
	message: string | undefined = undefined,
) => {
	throw <Error>{
		code: code,
		message: message ?? errorMessages[code] ?? 'Unknown Error',
	};
};

export const noContent = (res: express.Response) => {
	res.sendStatus(204);
};

export const content = (res: express.Response, content: any) => {
	res.status(200).send(content);
};

export const paramsId = (req: express.Request) => {
	const id = req.params['id'] as string | undefined;
	if (id === undefined || id === '') return makeError(400);
	if (isNaN(Number.parseInt(id))) return makeError(400);

	return id;
};
