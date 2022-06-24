import { Games } from '../shared/routes/games';
import * as reactDom from 'react-dom/client';

reactDom.hydrateRoot(
	document.getElementById('root')!!,
	<Games {...window.__uhc__} />,
);
