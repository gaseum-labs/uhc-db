import { Admin } from '../shared/routes/admin';
import * as reactDom from 'react-dom/client';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Admin {...window.__uhc__} />,
);
