import * as access from './access';
import * as db from './db';
import * as server from './server';

export const PORT = process.env.PORT ?? 8080;
export const PROJECT_ID = process.env['GOOGLE_CLOUD_PROJECT'];

/* entry point */
access.oauthClient;
db.ds;

server.app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});
