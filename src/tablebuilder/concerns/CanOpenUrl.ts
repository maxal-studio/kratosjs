import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds URL/link functionality
 */
export function CanOpenUrl<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanOpenUrl> {
	return class extends Base {
		public _url?: Resolvable<string>;
		public _shouldOpenUrlInNewTab: boolean = false;

		url(url: Resolvable<string>, shouldOpenInNewTab: boolean = false): this {
			this._url = url;
			this._shouldOpenUrlInNewTab = shouldOpenInNewTab;
			return this;
		}

		openUrlInNewTab(condition: boolean = true): this {
			this._shouldOpenUrlInNewTab = condition;
			return this;
		}

		getUrl(): string | undefined {
			if (typeof this._url === 'function') {
				return (this._url as () => string)();
			}
			return this._url;
		}

		shouldOpenUrlInNewTab(): boolean {
			return this._shouldOpenUrlInNewTab;
		}

		hasUrl(): boolean {
			return this._url !== undefined;
		}
	};
}

export interface CanOpenUrl {
	url(url: Resolvable<string>, shouldOpenInNewTab?: boolean): this;
	openUrlInNewTab(condition?: boolean): this;
	getUrl(): string | undefined;
	shouldOpenUrlInNewTab(): boolean;
	hasUrl(): boolean;
}
