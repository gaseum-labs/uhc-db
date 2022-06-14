import { Home } from '../shared/home';
import * as reactDom from 'react-dom/client';
import * as client from './client';
import * as shared from '../shared/shared';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Home
		isAdmin={window.__uhc__.isAdmin}
		minecraftUsername={window.__uhc__.minecraftUsername}
		discordUsername={window.__uhc__.discordUsername}
	/>,
);
