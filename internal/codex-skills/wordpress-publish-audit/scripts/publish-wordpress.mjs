import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const site = 'gzcuriousdad.wordpress.com';
const username = 'gzproger@msn.com';
const root = process.cwd();

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, timeout: 30000 }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
function member(value) {
  if (value && value.__base64) return `<base64>${value.__base64}</base64>`;
  if (Array.isArray(value)) return `<array><data>${value.map((item) => `<value>${member(item)}</value>`).join("")}</data></array>`;
  if (typeof value === 'object' && !Buffer.isBuffer(value)) return `<struct>${Object.entries(value).map(([k, v]) => `<member><name>${esc(k)}</name><value>${member(v)}</value></member>`).join('')}</struct>`;
  if (typeof value === 'boolean') return `<boolean>${value ? 1 : 0}</boolean>`;
  if (typeof value === 'number') return `<int>${value}</int>`;
  return `<string>${esc(value)}</string>`;
}
function xmlCall(method, params) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map((param) => `<param><value>${member(param)}</value></param>`).join('')}</params></methodCall>`;
}
function tag(text, name) {
  const match = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1] : '';
}
function decode(text) {
  return text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
}
async function rpc(password, method, params) {
  const response = await request(`https://${site}/xmlrpc.php`, { method: 'POST', headers: { 'content-type': 'text/xml', 'user-agent': 'CuriousDad-WordPressPublisher/1.0', 'content-length': Buffer.byteLength(xmlCall(method, params)) }, body: xmlCall(method, params) });
  const raw = response.body.toString('utf8');
  if (response.status !== 200 || raw.includes('<fault>')) throw new Error(`XML-RPC ${method} failed: ${decode(tag(raw, 'faultString') || `HTTP ${response.status}`)}`);
  return raw;
}
async function keyVaultPassword() {
  const tokenResponse = await fetch('http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net', { headers: { Metadata: 'true' } });
  if (!tokenResponse.ok) throw new Error('Managed identity token unavailable');
  const { access_token: token } = await tokenResponse.json();
  const secretResponse = await fetch('https://jzkvxixixi.vault.azure.net/secrets/wordpress?api-version=7.4', { headers: { Authorization: `Bearer ${token}` } });
  if (!secretResponse.ok) throw new Error(`Key Vault secret request failed (${secretResponse.status})`);
  return (await secretResponse.json()).value;
}
async function upload(password, filename, data, type) {
  const result = await rpc(password, 'wp.uploadFile', [0, username, password, { name: filename, type, bits: { __base64: data.toString('base64') } }]);
  const id = decode(tag(result, 'string'));
  const strings = [...result.matchAll(/<string>([\s\S]*?)<\/string>/g)].map((m) => decode(m[1]));
  const url = strings.find((value) => value.startsWith('https://'));
  if (!id || !url) throw new Error(`Media upload response was incomplete for ${filename}`);
  const probe = await fetch(url, { headers: { Range: "bytes=0-15" } });
  const firstBytes = Buffer.from(await probe.arrayBuffer());
  if (!probe.ok || !firstBytes.equals(data.subarray(0, firstBytes.length))) throw new Error(`Uploaded media bytes do not match ${filename}`);
  return { id, url };
}
function mime(filename) {
  const extension = path.extname(filename).toLowerCase();
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[extension] || 'application/octet-stream';
}
function extractMain(html) {
  const start = html.indexOf('<main');
  if (start < 0) throw new Error('No main element in article source');
  const contentStart = html.indexOf('>', start) + 1;
  const end = html.lastIndexOf('</main>');
  if (contentStart < 1 || end < contentStart) throw new Error('Malformed main element in article source');
  return html.slice(contentStart, end).trim();
}
async function imageReplacements(password, body, prefix) {
  const seen = new Map();
  const re = /src="data:(image\/(?:png|jpeg));base64,([^"]+)"/g;
  for (const match of body.matchAll(re)) {
    if (seen.has(match[0])) continue;
    const extension = match[1] === 'image/png' ? 'png' : 'jpg';
    const uploadResult = await upload(password, `${prefix}-inline-${String(seen.size + 1).padStart(2, '0')}.${extension}`, Buffer.from(match[2], 'base64'), match[1]);
    seen.set(match[0], `src="${uploadResult.url}"`);
  }
  for (const [from, to] of seen) body = body.replaceAll(from, to);
  return { body, count: seen.size };
}
async function articleFromSource(password, article) {
  const html = await fs.readFile(path.join(root, article.source), 'utf8');
  let body = extractMain(html);
  const inline = await imageReplacements(password, body, article.prefix);
  body = inline.body;
  for (const match of body.matchAll(/src="images\/([^"]+)"/g)) {
    const file = match[1];
    const media = await upload(password, article.prefix + "-" + file, await fs.readFile(path.join(root, path.dirname(article.source), "images", file)), mime(file));
    body = body.replaceAll(match[0], "src=\"" + media.url + "\"");
  }
  body = body.replace(/\sclass="[^"]*"/g, "").replace(/<p>\s*<\/p>/g, "");
  const hero = await upload(password, `${article.prefix}-hero${path.extname(article.hero)}`, await fs.readFile(path.join(root, article.hero)), mime(article.hero));
  const opening = `<p>${article.topic}</p><p>${article.label}</p><p>${article.summary}</p><!-- wp:more -->\n<!--more-->\n<!-- /wp:more -->`;
  const content = `${opening}${body}`;
  const newPost = article.postId ? await rpc(password, 'wp.editPost', [0, username, password, article.postId, { post_title: article.title, post_name: article.slug, post_excerpt: article.summary, post_content: content, post_thumbnail: hero.id, terms_names: { post_tag: article.tags } }]) : await rpc(password, 'wp.newPost', [0, username, password, {
    post_type: 'post', post_status: 'publish', post_title: article.title, post_name: article.slug,
    post_excerpt: article.summary, post_content: content, post_thumbnail: hero.id,
    terms_names: { post_tag: article.tags }
  }]);
  const postId = article.postId || decode(tag(newPost, 'int') || tag(newPost, 'string'));
  if (!postId) throw new Error(`Post creation returned no ID for ${article.slug}`);
  const fetched = await rpc(password, 'wp.getPost', [0, username, password, Number(postId)]);
  const strings = [...fetched.matchAll(/<string>([\s\S]*?)<\/string>/g)].map((m) => decode(m[1]));
  const permalink = strings.find((value) => value.startsWith('https://'));
  if (!permalink || !decode(fetched).includes('<!--more-->')) throw new Error(`Published post verification failed for ${article.slug}`);
  return { title: article.title, postId, permalink, images: inline.count + 1 };
}


const sourceFile = process.argv[2];
if (!sourceFile) throw new Error('Usage: node publish-wordpress.mjs article.json');
const article = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
for (const field of ['title', 'slug', 'source', 'hero', 'prefix', 'topic', 'label', 'summary', 'tags']) if (!(field in article)) throw new Error(`Missing article.${field}`);
const password = await keyVaultPassword();
try {
  await rpc(password, 'wp.getUsersBlogs', [username, password]);
  const result = await articleFromSource(password, article);
  console.log(JSON.stringify(result));
} finally {
  password.fill?.(0);
}
