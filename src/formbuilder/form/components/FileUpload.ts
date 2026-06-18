import { Field } from '../Field';
import { Resolvable, SerializedComponent } from '../../types';

/**
 * FileUpload component
 * Handles file uploads with validation and preview support
 */
class BaseFileUpload extends Field {
	protected componentType: string = 'fileUpload';
	protected _acceptedFileTypes: string[] = [];
	protected _maxSize?: number; // in KB
	protected _minSize?: number; // in KB
	protected _multiple: Resolvable<boolean> = false;
	protected _maxFiles?: number;
	protected _disk?: string;
	protected _storage?: string;
	protected _directory?: string;
	protected _visibility?: 'public' | 'private';

	acceptedFileTypes(types: string[]): this {
		this._acceptedFileTypes = types;
		return this;
	}

	maxSize(size: number): this {
		this._maxSize = size;
		return this;
	}

	minSize(size: number): this {
		this._minSize = size;
		return this;
	}

	multiple(condition: Resolvable<boolean> = true): this {
		this._multiple = condition;
		return this;
	}

	maxFiles(count: number): this {
		this._maxFiles = count;
		return this;
	}

	image(): this {
		this._acceptedFileTypes = ['image/*'];
		return this;
	}

	disk(disk: string): this {
		this._disk = disk;
		return this;
	}

	storage(name: string): this {
		this._storage = name;
		return this;
	}

	getStorage(): string | undefined {
		return this._storage;
	}

	directory(path: string): this {
		this._directory = path;
		return this;
	}

	visibility(visibility: 'public' | 'private'): this {
		this._visibility = visibility;
		return this;
	}

	getAcceptedFileTypes(): string[] {
		return this._acceptedFileTypes;
	}

	getMaxSize(): number | undefined {
		return this._maxSize;
	}

	getMinSize(): number | undefined {
		return this._minSize;
	}

	isMultiple(): boolean {
		return this.evaluate(this._multiple);
	}

	getMaxFiles(): number | undefined {
		return this._maxFiles;
	}

	getDisk(): string | undefined {
		return this._disk;
	}

	getDirectory(): string | undefined {
		return this._directory;
	}

	getVisibility(): 'public' | 'private' | undefined {
		return this._visibility;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'fileUpload';

		if (this._acceptedFileTypes.length > 0) {
			json.acceptedFileTypes = this._acceptedFileTypes;
		}

		if (this._maxSize !== undefined) {
			json.maxSize = this._maxSize;
		}

		if (this._minSize !== undefined) {
			json.minSize = this._minSize;
		}

		if (this.isMultiple()) {
			json.multiple = true;
		}

		if (this._maxFiles !== undefined) {
			json.maxFiles = this._maxFiles;
		}

		if (this._disk) {
			json.disk = this._disk;
		}

		if (this._storage) {
			json.storage = this._storage;
		}

		if (this._directory) {
			json.directory = this._directory;
		}

		if (this._visibility) {
			json.visibility = this._visibility;
		}

		return json;
	}
}

export class FileUpload extends BaseFileUpload {
	static make(name: string): FileUpload {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}

export interface FileUpload {
	acceptedFileTypes(types: string[]): this;
	maxSize(size: number): this;
	minSize(size: number): this;
	multiple(condition?: Resolvable<boolean>): this;
	maxFiles(count: number): this;
	image(): this;
	disk(disk: string): this;
	storage(name: string): this;
	getStorage(): string | undefined;
	directory(path: string): this;
	visibility(visibility: 'public' | 'private'): this;
}
