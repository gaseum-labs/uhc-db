import { Home } from '../shared/routes/home';
import * as reactDom from 'react-dom/client';
import * as client from './client';
import * as shared from '../shared/shared';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Home {...window.__uhc__} />,
);
