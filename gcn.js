var gcn = (function () {
    
    "use strict";
    
    var fs = require('fs'),
        readline = require('readline'),
        google = require('googleapis'),
        googleAuth = require('google-auth-library'),
        open = require('open'),
        colors = require('colors'),
        SCOPES = ['https://www. googleapis.com/auth/calendar.readonly'],
        TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/',
        TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
    
    /// <summary>Opens Google's Oath2 permission wizard </summary>
    function authorize(credentials, callback) {
        var clientSecret = credentials.installed.client_secret,
            clientId = credentials.installed.client_id,
            redirectUrl = credentials.installed.redirect_uris[0],
            auth = new googleAuth(),
            oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        
        // Check if we have a saved token, if not, tries to get one
        fs.readFile(TOKEN_PATH, function (err, token) {
            if (err) {
                getNewToken(oauth2Client, callback);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client);
            }
        });
    }
    
    ///<summary>Gathers a new token for this app</summary>
    function getNewToken(oauth2Client, callback) {
        
        var authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
        
        console.log();
        console.log('In order to continue please follow the link that was opened in your default browser'.yellow);
        open(authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log();
        rl.question('Type the code generated by Google in the previous step: '.cyan, function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) {
                    console.log('It was not possible to validate your token!'.red, err);
                    return;
                }
                oauth2Client.credentials = token;
                storeToken(token);
                callback(oauth2Client);
            });
        });
    }
    
    ///<summary>Saves the token data for future use</summary>
    function storeToken(token) {
        
        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_PATH);
    }
    
    /// <summary>Gathers all events from a given calendar</summary>
    function getEventsFor(calendar, auth, item) {
        calendar.events.list({
            auth: auth,
            calendarId: item.id,
            singleEvents: false,
            maxResults : 2500,
            showHiddenInvitations: true
        }, function (err, response) {
            if (err) {
                console.log('API error: '.red + err);
                return;
            }
            var events = response.items;
            if ((!response.items) || (events.length == 0)) {
                
                console.log('No event found.'.yellow);
            } else {
                
                console.log(events.length + ' events found.'.green);
                
                var data = "";
                for (var i = 0; i < events.length; i++) {
                    
                    var event = events[i];
                    var start = typeof event.start !== "undefined" ? event.start.dateTime || event.start.date : "";
                    console.log('%s - %s', start, event.summary);
                    var description = typeof event.description !== 'undefined' ? event.description.replace(/\r?\n|\r/g, "").replace(/\;/g, "|") : "";
                    data += item.summary + ";" +
                        event.summary + ";" +
                        description + ";" +   
                        start + ";" +
                        (typeof event.end !== "undefined" ? (event.end.dateTime || event.end.date) : "") + ";" +
                        event.location + ";" +
                        (typeof event.organizer !== "undefined" ? event.organizer.email : "") + ";" +
                        "\n";
                }
                
                fs.writeFile('events' + item.summary + '.csv', data, 'utf8', function (err) {
                    if (err) { return console.log(err); }
                    console.log('Fim!'.green);
                });
            }
        });
    }
    
    /// <summary>Gathers all calendars accessible via a given auth token</summary>
    function listEvents(auth) {
        var calendar = google.calendar('v3');
        calendar.calendarList.list({
            auth: auth
        }, function (err, responseC) {
            for (var c = 0; c < responseC.items.length; c++) {
                getEventsFor(calendar, auth, responseC.items[c]);
            }
        });
    }
    
    return {
        run: function () {
            /// <summary>App entry point</summary>
            fs.readFile('client_secret.json', function processClientSecrets(err, content) {
                if (err) {
                    console.log('File "client_secret.json" not found: '.red + err);
                    return;
                }
                
                authorize(JSON.parse(content), listEvents);
            });
        }
    };

})();

gcn.run();
