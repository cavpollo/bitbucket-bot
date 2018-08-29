# Quinela Party Parrot as a Service

## What's this?

A semi-terrible attempt at making a bot that posts pull request reminders on a slack channel. Don't ask.

## Usage

In your Slack room, just call the bot.

```
/invite @parrotbot
@parrotbot pester
```

Also, you'll need to configure the following variables in your Heroku environment:

```
GITHUB_AUTH_TOKEN=987fed
SLACK_BOT_TOKEN=123456
USER_MAPPING={"githubUsername":"slackUserId"}
```

### Tips

You can use this bot even better in combination with the Slack reminder.

For instance, the following reminder setting invokes the bot every weekday 11 am.

```
/remind #general “@parrotbot pester” at 10am every weekday
```

<img src="http://cultofthepartyparrot.com/parrots/hd/parrot.gif" width="32" height="32">