# WordPress API reference

Use this reference only when publishing or updating WordPress content. Never
put a real password in a committed command, script, fixture, or example.

## Endpoint selection

For a WordPress.com site:

- Public site and post reads:
  `https://public-api.wordpress.com/rest/v1.1/sites/<site>/`
- Site XML-RPC:
  `https://<site>/xmlrpc.php`

An application password can succeed with site XML-RPC even when the global
WordPress.com REST API rejects HTTP Basic authentication. Test the exact site
endpoint instead of assuming the credential is invalid.

## Useful XML-RPC methods

- `wp.getProfile`: verify the user and role on the target site.
- `wp.getPosts`: inspect titles, slugs, status, and raw content.
- `wp.getPost`: retrieve one post before editing it.
- `wp.uploadFile`: upload media and capture `id`, `file`, and `url`.
- `wp.newPost`: create the missing post.
- `wp.editPost`: modify the existing post ID during the QA loop.

Supply parameters in this order:

```text
blog_id, username, application_password, method-specific parameters
```

Escape XML text and base64-encode binary media. Check every response for
`methodResponse.fault` before using returned values.

## Publish fields

Use these `wp.newPost` fields as applicable:

- `post_type`: `post`
- `post_status`: `publish`
- `post_title`
- `post_name`: stable slug
- `post_excerpt`
- `post_content`
- `post_thumbnail`: uploaded hero media ID
- `terms_names`: tags and categories

Before `wp.newPost`, search existing posts for the intended title and slug.

## Required More marker

Use the raw marker exactly:

```html
<!-- wp:more -->
<!--more-->
<!-- /wp:more -->
```

The public display API may omit comments, so use `wp.getPost` when checking
whether the raw marker exists.

## Credential handling

- Accept credentials only when the user explicitly provides them for this
  task.
- Prefer an ephemeral environment variable or in-memory value.
- Do not place credentials in shell output, source files, screenshots, Git
  history, plans, or the final response.
- Do not print private profile fields returned by authenticated calls.
- Remind the user to revoke one-time credentials when finished.
