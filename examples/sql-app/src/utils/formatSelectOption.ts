/**
 * Formatters for SelectInput relationship options.
 * Serialized and executed on the frontend — must be self-contained.
 *
 * Media fields are resolved to { key, storage, url } by the panel before
 * the formatter runs, so use the `url` property directly.
 */

export const formatUserOption = (_value: any, record: any) => {
	const imageUrl = record.profileMediaImage?.url || null;
	const label = record.lastname ? `${record.firstname} ${record.lastname}` : record.firstname;
	const image = imageUrl ? `<img src="${imageUrl}" alt="${label}" width="50px" height="50px" />` : null;
	return `<div class="flex items-center gap-2">${image || ''} ${label}</div>`;
};
