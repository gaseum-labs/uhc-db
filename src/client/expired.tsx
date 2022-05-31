import { Expired } from '../shared/expired';
import * as reactDom from 'react-dom/client';

reactDom.hydrateRoot(document.getElementById('root')!!, <Expired />);
