import { Home } from '../shared/home';
import * as reactDom from 'react-dom/client';
import * as client from './client';
import * as shared from '../shared/shared';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Home
		number={window.__uhc__.number}
		isAdmin={window.__uhc__.isAdmin}
		minecraftUsername={window.__uhc__.minecraftUsername}
	/>,
);
