import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;

async function getStore(): Promise<Store> {
	if (!store) {
		store = await Store.load('markviewer-settings.json');
	}
	return store;
}

export const storeService = {
	async get<T>(key: string): Promise<T | null> {
		const s = await getStore();
		const value = await s.get<T>(key);
		return value ?? null;
	},

	async set<T>(key: string, value: T): Promise<void> {
		const s = await getStore();
		await s.set(key, value);
		await s.save();
	},

	async delete(key: string): Promise<void> {
		const s = await getStore();
		await s.delete(key);
		await s.save();
	},

	async clear(): Promise<void> {
		const s = await getStore();
		await s.clear();
		await s.save();
	}
};
