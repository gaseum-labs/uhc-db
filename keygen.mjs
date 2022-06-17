import * as crypto from 'crypto';
import * as fs from 'fs/promises';

crypto.generateKeyPair(
	'rsa',
	{
		modulusLength: 4096,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem',
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
		},
	},
	(err, pub, priv) => {
		if (err) {
			return console.log(err);
		}

		Promise.all([
			fs.writeFile('./keys/public.key', pub.toString()),
			fs.writeFile('./keys/private.key', priv.toString()),
		]).then(() => {
			console.log('wrote files');
		});
	},
);
