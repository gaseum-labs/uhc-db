import * as fs from 'fs';
import {
	ClassType,
	Component,
	ComponentState,
	ComponentClass,
	createElement,
} from 'react';
import * as reactServer from 'react-dom/server';

let templateParts: string[] = [];

export const loadTemplateParts = () => {
	const template = fs.readFileSync('app/template.html').toString();

	const titleIndex = template.indexOf('{{title}}');
	const rootIndex = template.indexOf('{{root}}');
	const dataIndex = template.indexOf('{{data}}');
	const scriptIndex = template.indexOf('{{script}}');

	templateParts = [
		template.substring(0, titleIndex),
		template.substring(titleIndex + 9, rootIndex),
		template.substring(rootIndex + 8, dataIndex),
		template.substring(dataIndex + 8, scriptIndex),
		template.substring(scriptIndex + 10),
	];
};

export const reactTemplate = <
	P extends {},
	T extends Component<P, ComponentState>,
	C extends ComponentClass<P>,
>(
	type: ClassType<P, T, C>,
	props: P,
	title: string,
	script: string,
) => {
	return (
		templateParts[0] +
		title +
		templateParts[1] +
		reactServer.renderToString(createElement(type, props)) +
		templateParts[2] +
		`window.__uhc__ = ${JSON.stringify(props)}` +
		templateParts[3] +
		script +
		templateParts[4]
	);
};
