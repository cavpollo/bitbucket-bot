'use strict'

const SlackBot = require('./SlackBot')

const workMessage = ['Chop chop, people!',
    'Ha! And you thought your day couldn\'t get any more boring...',
    'Are you ready?! It\'s time to... re-re-re-reviewwwww!',
    'If nobody addresses these code reviews, I\'ll hunt you down. Channel by channel...',
    'Hey, those PRs won\'t get approved by themselves. Go! Go! Go!',
    'Paging Dr. Reviewer, Paging Dr. Reviewer. The patient needs 10cc of reviews, stat!',
    'Whenever a PR goes unreviewed for more than a couple hours, a programmer gets bored and starts coding yet another CMS/ERP system. Please, let this madness stop!',
    'I don\'t want to point any fingers, but we need more eyeballs here.',
    'Tip: If you are too busy, just look for a missing `final` and reject the PR, it will buy you more time.',
    'Tip: If you think the reviewer\'s change request are annoying, just dismiss his opinions with an "Out of scope". Works. Every. Time.',
    'I don\'t get paid enough for this... do I even get paid at all?',
    'Roses are red.\nViolets are blue.\nI see you are bored.\nHere\'s some code to review.',
    'It\'s all fun and games until somebody gets his PR closed. Remember to check CircleCI\' status before submitting PRs for review.',
    'My parrot sense is tingling! I sense some smelly code!',
    'It is not easy being a passive-aggressive nagging parrot bot, but someone has to do it.',
    'Remember people, quality over quantity. It doesn\'t matter if you edit 100+ files. What is important is that they all sparkle :sparkles:.',
    'Don\'t forget checking for code formatting, or the next thing we know we will be using tab indentation! Oh, the horror!',
    'Don\'t worry if your code isn\'t perfect for production. The project will probably get shelved in 6 months anyway.',
    'Now would be a good time to reflect on your career choice. Pizza parlors are more profitable. Just saying...',
    'Can somebody program me so that I can comment on those code reviews. I really want to help...',
    '♪ Wake me uuuuup, when the code review ends ♫',
    'And remember, your code should be like abstract art. The less we see of it, the better.',
    'Remember to give your best by coding like there was no tomorrow. Just like our deadlines...',
    'This service was brought to you by "The Cult of the Parrot". The only cult were partying is encouraged.',
    'Think about this for a second: If the company starts paying by commit, then every time changes are requested, the richer you\'ll become. +Mindblown+ ',
    'For the holy party parrot in the sky, please let these PRs be less than 10 files each :pray:.',
    '//TODO write something funny and witty.',
    'Quick, look inside the PRs! I think I saw some promotional coupons for Hooters!',
    '-Knock knock. -Who\'s there? -Review. -Review who? -Review those PRs awaiting for your "invaluable expertise"!',
    'Could somebody show some mercy and put these PRs out of their misery? I mean, just look at them.',
    'It could be worse, you know? You could be forced to do QA to this code... :cold_sweat:',
    'Do you ever wonder why I seem to be saying the same things over and over again? Well, that\'s what a parrot does best, duh.',
    'If your review comment is more than 5 lines long, you are doing something wrong.',
    'Oh, these PRs? No, they are not important, pffff. It is not as if the pipeline was stopped because it needs your approval. That\'s crazy talk.',
    'I came here to chew gum and pester you about the pending PRS, and I\'m all out of bubble gum.',
    'I think I speak on behalf of everyone when I say, that we would be much honored if you people could critique this beautiful pieces of art.',
    'Keep up to date and download our super mega awesome PR Tracker™ Chrome Extension, it *almost* works!!!: https://chrome.google.com/webstore/detail/pr-tracker/lmjciebmhhokgndbcibahccbdahlddli']

const nothingMessage = ['Nothing to see here. Move along, move along.',
    'Don\'t forget to tag your peers for code reviews, or they won\'t get the sweet pleasure of being pestered by me!',
    'Remember to tag your PRs... or I will ignore them like I did just now ¬¬.',
    'So this is what they mean by "The calm before the storm"...',
    'Huh, nothing... I guess everyone is busy coding... right? RIGHT?!',
    'Did somebody say "Pericos"?',
    '♪ Tuncho tuncho tuncho tuncho tuncho ♫',
    'If debugging is the process of removing bugs, is coding the process that introduces them?',
    'Ignore me, I\'m just a bot, and bots don\'t have feelings... :sad_parrot:',
    'I\'m secretly dancing to the rhythm of La Macarena. Please don\'t tell anyone.',
    'Oh, crackers... I hate when this happens. I mean, when I don\'t get to give you orders.',
    'Making a PR to fix a typo on the Linux repo is poor attempt at adding "Linux Kernel maintainer" to one\'s CV... Just so you know. Definitely not something from personal experience.',
    'Don\'t blame me if your PR is not listed here. I\'m just a parrot that doesn\'t know what he is doing most of the time.',
    'Now would be a good time to be grateful for my altruistic services. I accept credit cards and all cryptocurrencies.',
    'I wish I had fingers to code... I would help to pair program, or even code review. Imagine the possibilities!']

class App {
    static start() {
        const controller = new SlackBot().getController()

        controller.hears("pester", ["direct_message", "direct_mention", "mention"], this.pester)
    }

    static pester(bot, message) {
        console.log("Pester heard!")

        let bitbucketUsername = process.env.BITBUCKET_USER
        let bitbucketToken = process.env.BITBUCKET_TOKEN
        let bitbucketOrganization = process.env.BITBUCKET_ORG

        let jiraUsername = process.env.JIRA_USER
        let jiraToken = process.env.JIRA_TOKEN
        let jiraOrganization = process.env.JIRA_ORG

        let userMapping = JSON.parse(process.env.USER_MAPPING || '{}')

        console.log("userMapping: " + userMapping)

        try {
            let authCode = authenticateBitbucket(bitbucketUsername, bitbucketToken)

            console.log(authCode)

            let repositories = getRepositories(bitbucketOrganization, authCode)

            console.log(repositories)

            let simplePullRequests = []
            for (let i = 0, repository; repository = repositories[i]; i++) {
                let pullRequestsData = getPullRequests(bitbucketOrganization, repository.slug)

                simplePullRequests.push(pullRequestsData)
            }

            console.log(simplePullRequests)

            let fullPullRequests = []
            for (let i = 0, pullRequest; pullRequest = simplePullRequests[i]; i++) {
                let pullRequestData = getPullRequest(bitbucketOrganization, pullRequest.repositorySlug, pullRequest.id, authCode)

                fullPullRequests.push(pullRequestData)
            }

            console.log(fullPullRequests)

            for (let i = 0, pullRequest; pullRequest = simplePullRequests[i]; i++) {
                let ticketId = /DEV-\d+/.exec(pullRequest.title)
                // if ticket id present
                let ticketData = getTicket(jiraUsername, jiraToken, jiraOrganization, ticketId)

                fullPullRequests.ticket = ticketData
            }

            console.log(fullPullRequests)

            success(bot, message, userMapping, fullPullRequests)
        } catch (e) {
            console.error(e)

            bot.reply({channel: message.channel}, {'text': 'Error, something went wrong and I don\'t know how to fix it... I\'m just a parrot :sad_parrot:'})
        }
    }
}

function authenticateBitbucket(bitbucketUsername, bitbucketToken) {
    let xmlHttp = new XMLHttpRequest()
    let url = "https://bitbucket.org/site/oauth2/access_token"

    xmlHttp.open("POST", url, false)
    xmlHttp.setRequestHeader('Content-Type', 'application/json')
    xmlHttp.setRequestHeader('grant_type', 'client_credentials')
    xmlHttp.setRequestHeader('Authorization', 'Basic ' + Base64.encode(bitbucketUsername + ":" + bitbucketToken))
    let response = xmlHttp.send()

    if (response.status === 200) {
        let jsonResponse = JSON.parse(response.responseText)
        return jsonResponse.access_token
    }

    console.error(response)

    return undefined
}

function getRepositories(bitbucketOrganization, authToken, page, repositories) {
    let xmlHttp = new XMLHttpRequest()

    if (page === undefined) {
        page = 1
    }

    let url = "https://api.bitbucket.org/2.0/repositories/" + bitbucketOrganization + "/?page=" + page

    xmlHttp.open("GET", url, false)
    xmlHttp.setRequestHeader('Content-Type', 'application/json')
    xmlHttp.setRequestHeader('Authorization', 'Bearer ' + authToken)
    let response = xmlHttp.send()

    if (response.status === 200) {
        let jsonResponse = JSON.parse(response.responseText)

        if (repositories === undefined) {
            repositories = []
        }

        for (var i = 0, repository; repository = jsonResponse.values[i]; i++) {
            // Get the repositories that are marked as services?
            let repoData = {
                uuid: repository.uuid,
                slug: repository.slug,
                name: repository.name,
                type: repository.type,
            }
            repositories.push(repoData)
        }

        if (jsonResponse.next) {
            return getRepositories(bitbucketOrganization, authToken, page + 1, repositories)
        }

        return repositories
    }

    console.error(response)

    return undefined
}

function getPullRequests(bitbucketOrganization, repositorySlug, authToken, page, pullRequests) {
    let xmlHttp = new XMLHttpRequest()

    if (page === undefined) {
        page = 1
    }

    let url = "https://api.bitbucket.org/2.0/repositories/" + bitbucketOrganization + "/" + repositorySlug +"/pullrequests/?page=" + page

    xmlHttp.open("GET", url, false)
    xmlHttp.setRequestHeader('Content-Type', 'application/json')
    xmlHttp.setRequestHeader('Authorization', 'Bearer ' + authToken)
    let response = xmlHttp.send()

    if (response.status === 200) {
        let jsonResponse = JSON.parse(response.responseText)

        if (pullRequests === undefined) {
            pullRequests = []
        }

        for (var i = 0, pullRequest; pullRequest = jsonResponse.values[i]; i++) {
            // ??
            let prData = {
                id: pullRequest.id,
                repositorySlug: repositorySlug,
                title: pullRequest.title,
                state: pullRequest.state,
                link: pullRequest.links.html.href,
            }
            pullRequests.push(prData)
        }

        if (jsonResponse.next) {
            return getPullRequests(bitbucketOrganization, repositorySlug, authToken, page + 1, pullRequests)
        }

        return pullRequests
    }

    console.error(response)

    return undefined
}

function getPullRequest(bitbucketOrganization, repositorySlug, id, authToken) {
    let xmlHttp = new XMLHttpRequest()

    let url = "https://api.bitbucket.org/2.0/repositories/" + bitbucketOrganization + "/" + repositorySlug +"/pullrequests/" + id

    xmlHttp.open("GET", url, false)
    xmlHttp.setRequestHeader('Content-Type', 'application/json')
    xmlHttp.setRequestHeader('Authorization', 'Bearer ' + authToken)
    let response = xmlHttp.send()

    if (response.status === 200) {
        let jsonResponse = JSON.parse(response.responseText)

        let reviewers = []
        for (let i = 0, participant; participant = jsonResponse.participants[i]; i++) {
            // Only REVIEWER
            let participantData = {
                role: participant.role,
                type: participant.type,
                approved: participant.approved,
                username: participant.user.username,
                userType: participant.user.type,
            }

            reviewers.push(participantData)
        }

        // ??
        let prData = {
            id: jsonResponse.id,
            repositorySlug: repositorySlug,
            title: jsonResponse.title,
            state: jsonResponse.state,
            type: jsonResponse.type,
            link: jsonResponse.links.html.href,
            reviewers: reviewers
        }

        return prData
    }

    console.error(response)

    return undefined
}

function getTicket(jiraUsername, jiraToken, jiraOrganization, ticketId) {
    let xmlHttp = new XMLHttpRequest()

    let url = "https://" + jiraOrganization + ".atlassian.net/rest/api/latest/issue/" + ticketId

    xmlHttp.open("GET", url, false)
    xmlHttp.setRequestHeader('Content-Type', 'application/json')
    xmlHttp.setRequestHeader('Authorization', 'Basic ' + Base64.encode(jiraUsername + ":" + jiraToken))
    let response = xmlHttp.send()

    if (response.status === 200) {
        let jsonResponse = JSON.parse(response.responseText)

        // Only "IN PROGRESS" and by team?
        let ticketData = {
            team: jsonResponse.fields.customfield_10900,
            status: jsonResponse.fields.status.name,
        }

        return ticketData
    }

    console.error(response)

    return undefined
}

function success(bot, message, userMapping, pullRequests) {
    var botMessage

    if (pullRequests.length > 0) {
        botMessage = ':warning: Attention! :warning:\nThese PRs need to be reviewed:\n'
        botMessage += pullRequests.map(pr => formatPullRequest(pr, userMapping)).join('\n')
        botMessage += '\n\n:party_parrot: ' + getRandomMessage(workMessage)
    } else {
        botMessage = 'No pull requests for now! :party_parrot:\n' + getRandomMessage(nothingMessage)
    }

    bot.reply({channel: message.channel}, {'text': botMessage})

    console.log('Done notifying')
}

function formatPullRequest(pullRequest, userMapping) {
    // ${pullRequest.critical ? ':rotating_light:' : ''}
    return `\`${pullRequest.title}\` ${pullRequest.reviewers ? pullRequest.reviewers.map(r => formatReviewers(r, userMapping) ).join(' ') : ''} - ${formatUrl(pullRequest.link)}`
}

function formatReviewers(reviewer, userMapping){
    const bitbucketUsername = reviewer.username
    const slackUsername = userMapping[bitbucketUsername]
    return slackUsername === undefined ? '*' + bitbucketUsername + '*' : '<@' + slackUsername + '>'
}

function getRandomMessage(messages){
    return messages[Math.floor(Math.random() * messages.length)]
}

function formatUrl(html_url){
    const regexp = new RegExp(`\\/([^\\/]+)\\/pull\\/(\\d+)$`)

    const matched = html_url.match(regexp)

    if (matched) {
        return '<' + html_url + '|' + matched[1] + ' #' + matched[2] + '>'
    }

    return html_url
}

module.exports = App
