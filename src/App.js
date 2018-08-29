'use strict'

const SlackBot = require('./SlackBot')
const requestPromise = require('request-promise')

const workMessage = ['Chop chop, people!',
    'Ha! And you thought your day couldn\'t get any more boring...',
    'Are you ready?! It\'s time to... re-re-re-reviewwwww!',
    'If nobody addresses these code reviews, I\'ll hunt you down. Channel by channel...',
    'Hey, those PRs won\'t get approved by themselves. Go! Go! Go!',
    'Paging Dr. Reviewer, Paging Dr. Reviewer. The patient needs 10cc of reviews, stat!',
    'Roses are red.\nViolets are blue.\nI see you are bored.\nHere\'s some code to review.',
    'My parrot sense is tingling! I sense some smelly code!',
    'It is not easy being a passive-aggressive nagging parrot bot, but someone has to do it.',
    'Don\'t worry if your code isn\'t perfect for production. The project will probably get shelved in 6 months anyway.',
    'Can somebody program me so that I can comment on those code reviews. I reeeeally want to help...',
    '♪ Wake me uuuuup, when the code review ends ♫',
    'This service was brought to you by "The Cult of the Parrot". The only cult were partying is encouraged.',
    'For the holy party parrot in the sky, please let these PRs be less than 10 files each :pray:.',
    '//TODO write something funny and witty.',
    'Quick, look inside the PRs! I think I saw some promotional coupons for Hooters!',
    'It could be worse, you know? You could be forced to do QA to this code... :cold_sweat:',
    'Do you ever wonder why I seem to be saying the same things over and over again? Well, that\'s what a parrot does best, duh.',
    'If your review comment is more than 5 lines long, you are doing something wrong.',
    'Oh, these PRs? No, they are not important, pffff. It is not as if the company\'s code production pipeline was stopped because it needs your approval. That\'s crazy talk.',
    'I came here to chew gum and pester you about the pending PRS, and I\'m all out of bubble gum.',
    'I bet my funny and witty messages are the highlight of your day, right?',
    'Nothing is more fun than reviewing someone else\'s code, am I right?',
    'Hahaha! We are just a couple years away from having machines take up *your* jobs. Erm... I mean, polly wants a cracker!',
    'If you are ever in doubt when reviewing code, ask yourself "What would Linus Torvalds do?" Well, probably post angry review comments, but you get the idea.',
    'Wow, really?!?! Wait, I mean, this PR looks, huh, _interesting_. Yes, _interesting_.']

const nothingMessage = ['Nothing to see here. Move along, move along.',
    'Don\'t forget to tag your peers for code reviews, or they won\'t get the sweet pleasure of being pestered by me!',
    'If the ticket associated to your PR is not in a "IN PROGRESS" status I will ignore it. Remember that.',
    'So this is what they mean by "The calm before the storm"...',
    'Huh, nothing... I guess everyone is busy coding... right? RIGHT?!',
    'Did somebody say "Pericos"?',
    '♪ Tuncho tuncho tuncho tuncho tuncho ♫',
    'If debugging is the process of removing bugs, is coding the process that introduces them?',
    'Ignore me, I\'m just a bot, and bots don\'t have feelings... :sad_parrot:',
    'I\'m secretly dancing to the rhythm of La Macarena. Please don\'t tell anyone.',
    'Making a PR to fix a typo on the Linux repo is poor attempt at adding "Linux Kernel maintainer" to one\'s CV... Just so you know. Definitely not something from personal experience.',
    'Don\'t blame me if your PR is not listed here. I\'m just a parrot that doesn\'t know what he is doing most of the time.',
    'Now would be a good time to be grateful for my altruistic services. I accept credit cards and all cryptocurrencies.',
    'I wish I had fingers to code... I would help to pair program, or even code review. Imagine the possibilities!',
    'Good news people! No pull requests! Now you can go back to playing some Doom on an devise that wasn\'t specifically to run it.',
    'Scientists here at Osigu labs are still looking for a way to bring me to a physical form. I\'m impatiently waiting.',
    'As nobody won\'t be busy reviewing code, can somebody fill a request to make me an official emoji?']

class App {
    static start() {
        const controller = new SlackBot().getController()

        controller.hears("pester", ["direct_message", "direct_mention", "mention"], this.pester)
    }

    static async pester(bot, message) {
        console.log("Pester heard!")

        let bitbucketUsername = process.env.BITBUCKET_USER
        let bitbucketToken = process.env.BITBUCKET_TOKEN
        let bitbucketOrganization = process.env.BITBUCKET_ORG

        let jiraUsername = process.env.JIRA_USER
        let jiraToken = process.env.JIRA_TOKEN
        let jiraOrganization = process.env.JIRA_ORG

        let userMapping = JSON.parse(process.env.USER_MAPPING || '{}')

        // console.log('userMapping: ' + userMapping)

        try {
            const accessToken = await authenticateBitbucket(bitbucketUsername, bitbucketToken)

            // console.log('accessToken: ' + accessToken)

            const repositories = await getRepositories(bitbucketOrganization, accessToken)

            // console.log('repositories')
            // console.log(repositories)

            let simplePullRequests = []
            for (let i = 0, repository; repository = repositories[i]; i++) {
                const pullRequestsData = await getPullRequests(bitbucketOrganization, repository.slug, accessToken)

                simplePullRequests = simplePullRequests.concat(pullRequestsData)
            }

            // console.log('simplePullRequests')
            // console.log(simplePullRequests)

            let fullPullRequests = []
            for (let i = 0, pullRequest; pullRequest = simplePullRequests[i]; i++) {
                const pullRequestData = await getPullRequest(bitbucketOrganization, pullRequest.repositorySlug, pullRequest.id, accessToken)

                fullPullRequests = fullPullRequests.concat(pullRequestData)
            }

            // console.log('fullPullRequests')
            // console.log(fullPullRequests)

            for (let i = 0, pullRequest; pullRequest = simplePullRequests[i]; i++) {
                const ticketId = /DEV-\d+/.exec(pullRequest.title)
                // if ticket id present

                if (ticketId) {
                    const ticketData = await getTicket(jiraUsername, jiraToken, jiraOrganization, ticketId)

                    fullPullRequests.ticket = ticketData
                } else {
                    console.error(`PR ${pullRequest.repositorySlug}/${pullRequest.id} has no ticket in title "${pullRequest.title}"`)
                }
            }

            // console.log('updated fullPullRequests')
            // console.log(fullPullRequests)

            const filteredPullRequests = fullPullRequests.filter(filterPullRequest)

            // console.log('filteredPullRequests')
            // console.log(filteredPullRequests)

            success(bot, message, userMapping, filteredPullRequests)
        } catch (e) {
            console.error(e.message)

            bot.reply({channel: message.channel}, {'text': 'Error, something went wrong and I don\'t know how to fix it... I\'m just a parrot :sad_parrot:'})
        }
    }
}

function encodeBase64(string) {
    return Buffer.from(string).toString('base64')
}

function authenticateBitbucket(bitbucketUsername, bitbucketToken) {
    console.log('start authenticateBitbucket')

    const options = {
        method: 'POST',
        uri: 'https://bitbucket.org/site/oauth2/access_token',
        headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${encodeBase64(bitbucketUsername + ':' + bitbucketToken)}`
        },
        form: {
            'grant_type': 'client_credentials'
        },
        json: true
    }

    return requestPromise(options)
        .then(function (jsonResponse) {
            return jsonResponse.access_token
        })
        .catch(function (err) {
            console.error('authenticateBitbucket failed')
            throw err
        })
}

function getRepositories(bitbucketOrganization, accessToken, page = 1) {
    console.log('start getRepositories page:' + page)

    const options = {
        method: 'GET',
        uri: 'https://api.bitbucket.org/2.0/repositories/' + bitbucketOrganization,
        qs: {
            page: page,
            pagelen: 25
        },
        headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        json: true
    }

    return requestPromise(options)
        .then(async function (jsonResponse) {
            let repositories = []
            for (var i = 0, repository; repository = jsonResponse.values[i]; i++) {
                let repoData = {
                    uuid: repository.uuid,
                    slug: repository.slug,
                    name: repository.name,
                    type: repository.type,
                }
                repositories.push(repoData)
            }

            if (jsonResponse.next) {
                const moreRepositories = await getRepositories(bitbucketOrganization, accessToken, page + 1)

                repositories = repositories.concat(moreRepositories)
            }

            return repositories
        })
        .catch(function (err) {
            console.error(`getRepositories page:${page} failed`)
            throw err
        })
}

function getPullRequests(bitbucketOrganization, repositorySlug, accessToken, page = 1) {
    console.log(`start getPullRequests repo:${repositorySlug} page:${page}`)

    const options = {
        method: 'GET',
        uri: `https://api.bitbucket.org/2.0/repositories/${bitbucketOrganization}/${repositorySlug}/pullrequests`,
        qs: {
            page: page,
            pagelen: 25
        },
        headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        json: true
    }

    return requestPromise(options)
        .then(async function (jsonResponse) {
            let pullRequests = []
            for (var i = 0, pullRequest; pullRequest = jsonResponse.values[i]; i++) {
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
                const morePullRequests = await getPullRequests(bitbucketOrganization, repositorySlug, accessToken, page + 1)

                pullRequests = pullRequests.concat(morePullRequests)
            }

            return pullRequests
        })
        .catch(function (err) {
            console.error(`getPullRequests repo:${repositorySlug} page:${page} failed`)
            throw err
        })
}

function getPullRequest(bitbucketOrganization, repositorySlug, id, accessToken) {
    console.log('start getPullRequest')

    const options = {
        method: 'GET',
        uri: `https://api.bitbucket.org/2.0/repositories/${bitbucketOrganization}/${repositorySlug}/pullrequests/${id}`,
        headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        json: true
    }

    return requestPromise(options)
        .then(async function (jsonResponse) {
            const reviewers = []
            for (let i = 0, participant; participant = jsonResponse.participants[i]; i++) {
                let participantData = {
                    role: participant.role,
                    type: participant.type,
                    approved: participant.approved,
                    username: participant.user.username,
                    userType: participant.user.type,
                }

                reviewers.push(participantData)
            }

            const prData = {
                id: jsonResponse.id,
                repositorySlug: repositorySlug,
                title: jsonResponse.title,
                state: jsonResponse.state,
                type: jsonResponse.type,
                link: jsonResponse.links.html.href,
                reviewers: reviewers
            }

            return prData
        })
        .catch(function (err) {
            console.error('getPullRequest failed')
            throw err
        })
}

function getTicket(jiraUsername, jiraToken, jiraOrganization, ticketId) {
    console.log('start getTicket id:' + ticketId)

    const options = {
        method: 'GET',
        uri: `https://${jiraOrganization}.atlassian.net/rest/api/latest/issue/${ticketId}`,
        headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + encodeBase64(jiraUsername + ":" + jiraToken)
        },
        json: true
    }

    return requestPromise(options)
        .then(async function (jsonResponse) {
            const ticketData = {
                team: jsonResponse.fields.customfield_10900.value,
                status: jsonResponse.fields.status.name,
            }

            return ticketData
        })
        .catch(function (err) {
            console.error(`getTicket id:${ticketId} failed`)
            throw err
        })
}

function filterPullRequest(pullRequest) {
    if (pullRequest.reviewers.filter(filterReviewer).length === 0) {
        // console.log(`No missing reviewers found id:${pullRequest.repositorySlug}/${pullRequest.id}`)
        // console.log(pullRequest.reviewers)
        return false
    }

    if (pullRequest.ticket && pullRequest.ticket.status !== 'IN PROGRESS') {
        // console.log(`The PR has its ticket in a "${pullRequest.ticket.status}" status id:${pullRequest.repositorySlug}/${pullRequest.id}`)
        return false
    }

    return true
}

function filterReviewer(reviewer) {
    return reviewer.approved === false && reviewer.role === 'REVIEWER'
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
    return `\`${pullRequest.title}\` ${pullRequest.reviewers ? pullRequest.reviewers.filter(filterReviewer).map(r => formatReviewers(r, userMapping)).join(' ') : ''} - ${formatUrl(pullRequest.link)}`
}

function formatReviewers(reviewer, userMapping) {
    const bitbucketUsername = reviewer.username
    const slackUsername = userMapping[bitbucketUsername]
    return slackUsername === undefined ? `*${bitbucketUsername}*` : `<@${slackUsername}>`
}

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)]
}

function formatUrl(html_url) {
    const regexp = new RegExp(`\\/([^\\/]+)\\/pull\\/(\\d+)$`)

    const matched = html_url.match(regexp)

    if (matched) {
        return `<${html_url}|${matched[1]} #${matched[2]}>`
    }

    return html_url
}

module.exports = App
