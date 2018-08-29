# Bitbucket Review Reminder Party Parrot as a Service

## What's this?

A semi-terrible attempt at making a bot that posts pull request reminders on a slack channel.

## Usage

In your Slack room, just call the bot.

```
/invite @parrotbot
@parrotbot pester
```

Also, you'll need to configure the following variables in your Heroku environment:

```
BITBUCKET_USER=abc123
BITBUCKET_TOKEN=def456
BITBUCKET_ORG=awesomeorg
JIRA_USER=abc123
JIRA_TOKEN=def456
JIRA_ORG=awesomeorg
USER_MAPPING={"bitbucketUsername":"slackUserId"}
```

### Tips

You can use this bot even better in combination with the Slack reminder.

For instance, the following reminder setting invokes the bot every weekday 11 am.

```
/remind #general “@parrotbot pester” at 10am every weekday
```

<img src="http://cultofthepartyparrot.com/parrots/hd/parrot.gif" width="32" height="32">