export module Shared {}

declare global {
	interface Window {
		__uhc__: any;
	}
}

export const randomRange = (low: number, high: number) => {
	return Math.floor(Math.random() * (high - low + 1)) + low;
};

export const nowSeconds = () => Math.floor(Date.now() / 1000);

export const host = 'http://localhost:8080';
