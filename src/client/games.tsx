import { Games } from '../shared/games';
import * as reactDom from 'react-dom/client';

reactDom.hydrateRoot(document.getElementById('root')!!, <Games />);
