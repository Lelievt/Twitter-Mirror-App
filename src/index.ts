import {
    Module,
    Controller
} from 'elios-sdk';
import {
    BrowserWindow
} from 'electron';

var NodeTwitterAPI = require('node-twitter-api');
import * as Twitter from 'twitter'

var credentials = require('./../resources/credentials.json')

var cheerio = require('cheerio'),
    html = require('./index.html')

const $ = cheerio.load(html);

export default class TwitterApp implements Module {
    name: string = 'TwitterApp';
    installId: string = '';

    requireVersion: string = '0.0.1';
    showOnStart: boolean = true;

    widget: any;
    token: any;
    client: any;


    constructor(private elios: Controller) {
        console.log('Construtor');
    }

    init() {
        console.log('MODULE DEV LOADED ' + this.name);
    }

    showTweets(tweets: Array<any>) {
        console.log(tweets[0]);
        for(let i = 0; i < tweets.length; i++) {
            let elem = $('<li' + ((i == 0) ? ' class="firstTweet"' : '>') + '</li>');

            let header = $('<div class=header></div>');
            $(header).append('<img class="profile_picture" src="' + tweets[i].user.profile_image_url_https + '"></img>');
            $(header).append('<p class="user_name">' + tweets[i].user.name + '</p>');
            $(header).append('<p class="screen_name">' + '@' + tweets[i].user.screen_name + '</p>');


            $(elem).append(header);
            $(elem).append('<div><p class="tweet_content">' + tweets[i].text + '</p></div>');


            $('#twitter').append(elem);
        }
        this.widget.html.next($('#twitter-container').html());
    }

    authenticate() {
        const twitterAuth = new NodeTwitterAPI({
            callback: credentials.twitter.callbackURL,
            consumerKey: credentials.twitter.consumerKey,
            consumerSecret: credentials.twitter.consumerSecret,
          })
      
          twitterAuth.getRequestToken((error: any, requestToken: any, requestTokenSecret: any) => {
            if (error) {
              // TODO: Send event to main window
              throw Error('Something went wrong while authenticating with Twitter: ' + error.data)
            }
      
            const url = twitterAuth.getAuthUrl(requestToken)
      
            let authWindow = new BrowserWindow({
              width: 800,
              height: 600,
              autoHideMenuBar: true,
              webPreferences: {
                nodeIntegration: false
              }
            })
      
            authWindow.webContents.on('will-navigate', (e, url) => {
              const matched = url.match(/\?oauth_token=([^&]*)&oauth_verifier=([^&]*)/)
      
              if (matched) {
                e.preventDefault()
      
                twitterAuth.getAccessToken(requestToken, requestTokenSecret, matched[2], (error: any, accessToken: any, accessTokenSecret: any) => {
                  if (error) {
                    // TODO: Send event to main window
                    throw Error('Something went wrong while authenticating with Twitter: ' + error.data)
                  }
      
                  this.token = {
                    service: 'twitter',
                    accessToken: accessToken,
                    accessTokenSecret: accessTokenSecret
                  }
      
                  this.client = new Twitter({
                    consumer_key: credentials.twitter.consumerKey,
                    consumer_secret: credentials.twitter.consumerSecret,
                    access_token_key: this.token['accessToken'],
                    access_token_secret: this.token['accessTokenSecret']
                  })
      
                  this.client.get('account/verify_credentials', {}, (error: any, data: any, response: any) => {
                    if (error) {
                      console.log(JSON.stringify(error))
                    }
      
                    this.token['id_str'] = data.id_str
      
                    this.getUserTimeline();
                    
                    if (authWindow) {
                      authWindow.close()
                    }
                  })
                })
              }
            })
      
            authWindow.loadURL(`${url}&force_login=true`)
          })

    }

    getUserTimeline() {
          this.client.get('statuses/home_timeline', {}, (error: any, tweets: any, response: any) => {
            if (!error) {
                this.showTweets(tweets);
            } else {
                console.log(error);
            }
          });
    }

    start() {
        console.log('MODULE STARTED ' + this.name);
        this.widget = this.elios.createWidget({
            id: this.installId
        });
        this.widget.html.next($('#twitter-container').html());

        this.authenticate();
    }

    stop() {
        console.log('MODULE STOPED ' + this.name);
    }
}