export const postRequest = (url: string, body: any = undefined) => {
	return fetch(url, {
		method: 'POST',
		body: body === undefined ? undefined : JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});
};

export const getCookie = (key: string) => {
	return document.cookie
		.split('; ')
		.find(row => row.startsWith(`${key}=`))
		?.split('=')[1];
};

export const fakeDownload = (data: Blob, filename: string) => {
	const link = document.createElement('a');
	link.href = window.URL.createObjectURL(data);
	link.download = filename;

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

export const getFilename = (response: Response) => {
	const disposition = response.headers.get('Content-disposition');
	if (disposition === null) return undefined;

	const startIndex = disposition.indexOf('filename="');
	if (startIndex === -1) return undefined;

	const endIndex = disposition.indexOf('"', startIndex);
	if (startIndex === -1) return undefined;

	return disposition.substring(startIndex, endIndex);
};
