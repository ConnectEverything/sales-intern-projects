# sales-intern-projects
To get started, setup your `.env` with Github OAuth credentials:

- `cp .env.example .env`

To setup a
[Github OAuth App](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps)

- Go to https://github.com/settings/applications/new
- Set `Application name` to `Deploy Chat Example`
- Set `Homepage URL` to your project URL. (eg:
  `http://localhost:8000`)
- Set `Authorization callback URL` to
  localhost for development.
- Add `Client ID` and `Client Secret` in the `.env` file.

Start NATS server. Create server.conf in a vim:

```
websocket {
        listen: localhost:8080
        no_tls: true
        compression: true
}
jetstream {}
```
Run
```
nats-server -c server.conf
```

Fire up the server in your project directory:

```
deno task start
```
