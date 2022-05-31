export const postRequest = (url: string, body: any) => {
	return fetch(url, {
		method: 'POST',
		body: JSON.stringify(body),
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
