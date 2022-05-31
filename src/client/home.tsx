import { Home } from '../shared/home';
import * as reactDom from 'react-dom/client';
import * as client from './client';
import * as shared from '../shared/shared';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Home number={window.__uhc__.number} isAdmin={window.__uhc__.isAdmin} />,
);

const params = new URLSearchParams(window.location.search);
if (params.get('download-token') === 'true') {
	const refreshToken = client.getCookie('refresh-token');

	if (refreshToken !== undefined) {
		client
			.postRequest('/api/downloadToken', {
				refreshToken: refreshToken,
			})
			.then(async response => {
				const blob = await response.blob();
				client.fakeDownload(blob, 'token.json');
			});
	}
}
