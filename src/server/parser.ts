import * as util from './util';

export const parseField = (
	body: any,
	name: string,
	type: string,
	nullable: boolean = false,
) => {
	const field = body[name];
	if (typeof field !== type && !(nullable && field === undefined)) {
		util.makeError(400, `Expected ${name} to be a ${type}`);
	}
	return field;
};

export const parseArray = (
	body: any,
	name: string | undefined,
	type: string,
) => {
	const field = name === undefined ? body : body[name];
	if (!Array.isArray(field)) {
		util.makeError(400, `Expected ${name} to be an Array`);
	}
	for (let sub of field) {
		if (typeof sub !== type) {
			util.makeError(400, `Expected entries of ${name} to be a ${type}`);
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
		util.makeError(400, `Expected ${name} to be an Array`);
	}
	const ret: T[] = Array(field.length);
	for (let sub of field) {
		ret.push(transform(sub));
	}
	return ret;
};
