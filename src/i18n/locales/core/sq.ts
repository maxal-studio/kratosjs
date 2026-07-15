// Core SERVER framework strings (Albanian / Shqip). Namespace: `core`.
// Mirrors the keys in `./en.ts`.

const sq = {
	// Generic action results.
	'action.completed': 'Veprimi u krye me sukses',
	'action.failed': 'Veprimi dështoi',
	'action.name_required': 'Emri i veprimit është i detyrueshëm',
	'action.data_required': 'Të dhënat e veprimit janë të detyrueshme',
	'action.handler_not_found': 'Trajtuesi i veprimit "{action}" nuk u gjet',
	'action.no_permission': 'Nuk keni leje për të kryer këtë veprim',
	'action.no_permission_bulk': 'Nuk keni leje për të vepruar mbi këto regjistrime',
	'action.no_valid_records': 'Nuk u gjetën regjistrime të vlefshme',

	// Records / access.
	'record.not_found': 'Regjistrimi nuk u gjet',
	'record.access_denied_view': 'Qasja për të parë këtë regjistrim u refuzua',
	'record.created': 'Regjistrimi u krijua me sukses',
	'record.updated': 'Regjistrimi u përditësua me sukses',
	'record.deleted': 'Regjistrimi u fshi me sukses',
	'request.ids_required': 'Lista e ids është e detyrueshme',

	// Export.
	'export.no_exporter': 'Nuk ka eksportues të regjistruar për formatin "{format}"',
	'export.no_permission': 'Nuk keni leje për të eksportuar këtë burim',

	'access.operation_disabled': 'Veprimi {operation} është i çaktivizuar për këtë burim',

	'relation.not_found': 'Relacioni nuk u gjet',
	'relation.related_not_found': 'Burimi i lidhur nuk u gjet',
	'relation.update_unsupported':
		'Përditësimi i relacionit nuk mbështetet. Përditësoni regjistrimin e lidhur drejtpërdrejt përmes endpoint-it të tij.',

	'media.no_permission_manage': 'Nuk keni leje për të menaxhuar median për këtë burim',
	'media.file_required': 'Të dhënat e skedarit janë të detyrueshme',
	'media.no_permission_upload': 'Nuk keni leje për të ngarkuar këtë skedar',
	'media.adapter_not_found': 'Adaptuesi i medias nuk u gjet',
	'media.key_required': 'Çelësi i skedarit është i detyrueshëm',
	'media.no_permission_delete': 'Nuk keni leje për të fshirë këtë skedar',
	'media.deleted': 'Skedari u fshi me sukses',

	'page.not_found': 'Faqja "{slug}" nuk u gjet',
	'page.access_denied': 'Qasja në këtë faqe u refuzua',

	'resource.not_found': 'Burimi "{slug}" nuk u gjet',

	'auth.invalid_credentials': 'Kredenciale të pavlefshme',
	'auth.invalid_challenge': 'Sfidë e pavlefshme',
	'auth.verification_failed': 'Verifikimi dështoi',
	'auth.provider_required': 'Emri i ofruesit është i detyrueshëm',
	'auth.challenge_fields_required': 'challengeToken dhe type janë të detyrueshme',
	'auth.user_lookup_not_configured': 'Funksioni i kërkimit të përdoruesit nuk është konfiguruar',
	'auth.no_token': 'Nuk u dha token',
	'auth.invalid_token': 'Token i pavlefshëm ose i skaduar',
	'auth.invalid_refresh_token': 'Token rifreskimi i pavlefshëm ose i skaduar',
	'auth.refresh_token_required': 'Token-i i rifreskimit është i detyrueshëm',
	'auth.logged_out': 'Dolët me sukses',
	'auth.missing_oauth_params': 'Mungon parametri code ose state',
	'auth.invalid_state': 'Parametër state i pavlefshëm',
	'auth.oauth_failed': 'Autentifikimi OAuth dështoi',
	'auth.unauthorized_no_token': 'I paautorizuar - Nuk u dha token',
	'auth.unauthorized_invalid_token': 'I paautorizuar - Token i pavlefshëm ose i skaduar',
	'auth.csrf_mismatch': 'Mospërputhje e token-it CSRF',

	// Validation messages.
	'validation.required': 'Fusha "{label}" është e detyrueshme',
	'validation.email': 'Fusha "{label}" duhet të jetë një email i vlefshëm',
	'validation.url': 'Fusha "{label}" duhet të jetë një URL e vlefshme',
	'validation.integer': 'Fusha "{label}" duhet të jetë një numër i plotë',
	'validation.numeric': 'Fusha "{label}" duhet të jetë një numër',
	'validation.alpha': 'Fusha "{label}" mund të përmbajë vetëm shkronja',
	'validation.alpha_num': 'Fusha "{label}" mund të përmbajë vetëm shkronja dhe numra',
	'validation.alpha_dash': 'Fusha "{label}" mund të përmbajë vetëm shkronja, numra, vija dhe nënvija',
	'validation.uuid': 'Fusha "{label}" duhet të jetë një UUID i vlefshëm',
	'validation.json': 'Fusha "{label}" duhet të jetë JSON i vlefshëm',
	'validation.regex': 'Formati i fushës "{label}" është i pavlefshëm',

	'validation.min.string': 'Fusha "{label}" duhet të ketë të paktën {param} karaktere',
	'validation.max.string': 'Fusha "{label}" nuk mund të ketë më shumë se {param} karaktere',
	'validation.min.number': 'Fusha "{label}" duhet të jetë të paktën {param}',
	'validation.max.number': 'Fusha "{label}" nuk mund të jetë më e madhe se {param}',
	'validation.min_value': 'Fusha "{label}" duhet të jetë të paktën {param}',
	'validation.max_value': 'Fusha "{label}" nuk mund të jetë më e madhe se {param}',

	'validation.same': 'Fusha "{label}" duhet të përputhet me {param}',
	'validation.confirmed': 'Konfirmimi i fushës "{label}" nuk përputhet',

	'validation.invalid': 'Fusha "{label}" është e pavlefshme',
	'validation.type.string': 'Fusha "{label}" duhet të jetë tekst',
	'validation.type.number': 'Fusha "{label}" duhet të jetë numër',
	'validation.type.boolean': 'Fusha "{label}" duhet të jetë vlerë logjike',
	'validation.type.array': 'Fusha "{label}" duhet të jetë varg',
	'validation.type.array_items': 'Fusha "{label}" duhet të jetë një varg me tekste ose numra',
	'validation.type.object': 'Fusha "{label}" duhet të jetë objekt',
	'validation.type.date': 'Fusha "{label}" duhet të jetë një datë e vlefshme',
	'validation.readonly': 'Fusha "{label}" është vetëm për lexim',
	'validation.invalid_option': 'Fusha "{label}" ka një opsion të pavlefshëm',
	'record.deleted_count': '{count} regjistrim(e) u fshinë me sukses',
	'auth.provider_not_found': 'Ofruesi "{provider}" nuk u gjet',
	'auth.provider_no_oauth': 'Ofruesi "{provider}" nuk mbështet OAuth',
	'auth.provider_no_oauth_callback': 'Ofruesi "{provider}" nuk mbështet OAuth callback',
	'search.failed': 'Kërkimi global dështoi',
};

export default sq;
