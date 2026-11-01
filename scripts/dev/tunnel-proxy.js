// Local reverse proxy that mirrors the production nginx routing, so ONE ngrok tunnel can serve the whole app:
//   /api/*     -> API (prefix stripped)       /graphql -> API /graphql
//   everything else (incl. websockets for Next HMR) -> client dev server
// Usage: API_PORT=4101 CLIENT_PORT=4200 PORT=8080 node scripts/dev/tunnel-proxy.js
const http = require("http");
const net = require("net");

const API = Number(process.env.API_PORT || 4101);
const CLIENT = Number(process.env.CLIENT_PORT || 4200);
const PORT = Number(process.env.PORT || 8080);

function route(url) {
	if (url === "/graphql" || url.startsWith("/graphql?")) return { port: API, path: url };
	if (url.startsWith("/api/")) return { port: API, path: url.slice(4) };
	return { port: CLIENT, path: url };
}

const server = http.createServer((req, res) => {
	const { port, path } = route(req.url);
	const upstream = http.request(
		{ host: "127.0.0.1", port, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } },
		(up) => {
			res.writeHead(up.statusCode, up.headers);
			up.pipe(res);
		},
	);
	upstream.on("error", (err) => {
		res.writeHead(502, { "content-type": "text/plain" });
		res.end(`Upstream ${port} unavailable: ${err.code}`);
	});
	req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
	const { port, path } = route(req.url);
	const upstream = net.connect(port, "127.0.0.1", () => {
		const headers = Object.entries({ ...req.headers, host: `127.0.0.1:${port}` })
			.map(([k, v]) => `${k}: ${v}`)
			.join("\r\n");
		upstream.write(`${req.method} ${path} HTTP/1.1\r\n${headers}\r\n\r\n`);
		if (head.length) upstream.write(head);
		socket.pipe(upstream).pipe(socket);
	});
	upstream.on("error", () => socket.destroy());
	socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "127.0.0.1", () => console.log(`proxy on http://127.0.0.1:${PORT}  (api :${API}, client :${CLIENT})`));
