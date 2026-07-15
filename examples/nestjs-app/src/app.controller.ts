import { Controller, Get, Header } from '@nestjs/common';

/**
 * A plain NestJS controller. It owns the application root ('/') — proving the
 * KratosJs panel (mounted at /admin) stays out of the way of your own routes.
 */
@Controller()
export class AppController {
	@Get()
	@Header('Content-Type', 'text/html; charset=utf-8')
	root(): string {
		return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>NestJS + KratosJs</title>
		<style>
			:root { color-scheme: light dark; }
			body {
				margin: 0;
				min-height: 100vh;
				display: grid;
				place-items: center;
				font: 16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
				background: #0b0d12;
				color: #e6e8ee;
			}
			.card {
				max-width: 32rem;
				padding: 2.5rem;
				border: 1px solid #23283a;
				border-radius: 16px;
				background: #12151d;
			}
			h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
			p { margin: .25rem 0 1.25rem; color: #9aa3b8; }
			a.btn {
				display: inline-block;
				padding: .6rem 1rem;
				border-radius: 10px;
				background: #4f7cff;
				color: #fff;
				text-decoration: none;
				font-weight: 600;
			}
			code { background: #1c2030; padding: .15rem .4rem; border-radius: 6px; }
			ul { padding-left: 1.1rem; color: #9aa3b8; }
		</style>
	</head>
	<body>
		<div class="card">
			<h1>This is the NestJS app 👋</h1>
			<p>A KratosJs admin panel is mounted onto it — the two coexist on one server.</p>
			<ul>
				<li><code>/</code> — this page (a Nest controller)</li>
				<li><code>/welcome</code> — a KratosJs server-rendered page (SSR Views)</li>
				<li><code>/admin</code> — the KratosJs admin UI</li>
				<li><code>/kratosjs/api</code> — the panel API</li>
			</ul>
			<p>
				<a class="btn" href="/admin">Open the admin panel →</a>
				&nbsp;<a class="btn" href="/welcome" style="background:#22c55e">See an SSR page →</a>
			</p>
		</div>
	</body>
</html>`;
	}
}
