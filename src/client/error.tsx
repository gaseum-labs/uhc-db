import { Error } from '../shared/routes/error';
import * as reactDom from 'react-dom/client';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Error {...window.__uhc__} />,
);
