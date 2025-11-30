export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

class ToastStore {
	toasts = $state<Toast[]>([]);

	private add(message: string, type: ToastType, duration = 3000) {
		const id = crypto.randomUUID();
		const toast: Toast = { id, message, type, duration };
		this.toasts.push(toast);

		if (duration > 0) {
			setTimeout(() => this.remove(id), duration);
		}

		return id;
	}

	remove(id: string) {
		const index = this.toasts.findIndex((t) => t.id === id);
		if (index !== -1) {
			this.toasts.splice(index, 1);
		}
	}

	success(message: string, duration?: number) {
		return this.add(message, 'success', duration);
	}

	error(message: string, duration?: number) {
		return this.add(message, 'error', duration ?? 5000);
	}

	info(message: string, duration?: number) {
		return this.add(message, 'info', duration);
	}

	warning(message: string, duration?: number) {
		return this.add(message, 'warning', duration ?? 4000);
	}
}

export const toastStore = new ToastStore();
