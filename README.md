# Courier Automation Sync

`🇺🇸 => 🇪🇺`

A script to copy the latest published automations US instance of Courier to the EU instance of Courier and mutate automation content as needed.

Run every time an automation is changed in US.

## Setup

Make sure you have `node` installed and run `yarn`.

1. `cp .env.example .env`
2. Log into both the Courier US and EU instances. 
3. Open the network tab and inspect any XHR request to `api{.eu}.courier.com/studio/q?=` and copy the `authorization`
   value (JWT)
4. Paste these values into their respective `US_AUTHORIZATION` and `EU_AUTHORIZATION` environment keys.
5. Copy the `tenant_id` query param from the request and use in the `TENANT_ID` environment key.

## Running the script

```bash
$ node index.js <environment>
```

`environment` must equal `test` or `production`. By default it will run in `test`

## Troubleshooting

### JWT expired error

The `US_AUTHORIZATION` or `EU_AUTHORIZATION` values are stale. Repeat setup steps 3-4 and try again.
